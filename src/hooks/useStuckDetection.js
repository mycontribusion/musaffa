import { useRef, useCallback, useEffect } from 'react';

/**
 * How long the same verse may sit below target — with no new speech arriving —
 * before we assume the user is genuinely stuck and play the hint for them.
 *
 * This has to be a real delay. The trigger condition ("this verse has been
 * started, nothing is pending, accuracy is under target") is satisfied the
 * instant a verse is *attempted*, so with no timer the hint fired on the very
 * first result of every verse and talked over the user.
 */
export const STUCK_HINT_DELAY_MS = 4000;
export const PROGRESSION_MISMATCH_DELAY_MS = 2500; // Faster for hands-free case

/**
 * How long the recogniser must stay quiet — producing no new words at all —
 * before we treat the current turn as finished.
 *
 * Completion cannot be judged on accuracy alone: `checkAutoFinish` requires
 * *every* verse in the portion to clear the threshold, which for a page-sized
 * portion is effectively unreachable, so there was no path out of a turn other
 * than manually forcing it. This timer supplies the missing exit — it only
 * signals a settled turn once the user has actually recited to the end of the
 * portion, so it can never skip un-recited ayahs.
 */
export const TURN_SETTLE_DELAY_MS = 3500;

/**
 * New "no green word" stuck detection: if no word turns green (status === 'correct')
 * within this many milliseconds, the user is considered stuck.
 * Default 5000ms (5s), configurable via stuckTimerDuration prop (3-9s).
 */
export const NO_GREEN_WORD_DELAY_MS = 5000;

const computeVerseWordRanges = (ayahWordCounts = []) => {
  const ranges = [];
  let start = 0;
  for (let i = 0; i < ayahWordCounts.length; i++) {
    const count = ayahWordCounts[i];
    ranges.push({ start, end: start + count - 1 });
    start += count;
  }
  return ranges;
};

export const useStuckDetection = ({
  onStuck,
  interruptHint,
  onAutoFinish,
  onTurnSettled,
  threshold,
  ayahWordCounts = [],
  lastMatchedExpIdx = -1,
  stuckTimerDuration = 5, // seconds, default 5s
}) => {
  const stuckTimerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const latestVerseStatsRef = useRef(null);
  const latestPayloadRef = useRef(null);
  const onStuckRef = useRef(onStuck);
  const interruptHintRef = useRef(interruptHint);
  const onAutoFinishRef = useRef(onAutoFinish);
  const onTurnSettledRef = useRef(onTurnSettled);

  const hintedVerseIndexRef = useRef(null);
  const hintTranscriptSnapshotRef = useRef('');
  const hintPayloadSnapshotRef = useRef(null);
  const isHintPlayingRef = useRef(false);
  const hintPassedRef = useRef(false);
  /** Latches once a settle has been reported, so one quiet period reports once. */
  const settleFiredRef = useRef(false);
  const mismatchCountRef = useRef(0);
  const lastMatchedAtRef = useRef(() => ({ idx: -1, verse: -1, ts: Date.now() }));
  const noProgressMsRef = useRef(0);

  // ── New "no green word" stuck detection refs ──────────────────────────────
  /** Highest expected-word index (within current verse) that has been marked 'correct'. */
  const lastCorrectVerseWordIdxRef = useRef(-1);
  /** Timer that fires if NO_GREEN_WORD_DELAY_MS passes without a new green word. */
  const noGreenWordTimerRef = useRef(null);
  /** Whether the no-green-word detection is currently armed. */
  const noGreenWordArmedRef = useRef(false);
  /** The verse index for which the timer is currently armed. */
  const armedVerseIndexRef = useRef(null);
  /** The verse word ranges for the current chunk (updated when ayahWordCounts changes). */
  const verseWordRangesRef = useRef([]);

  // Keep verse word ranges in sync with ayahWordCounts
  useEffect(() => {
    verseWordRangesRef.current = computeVerseWordRanges(ayahWordCounts);
  }, [ayahWordCounts]);

  useEffect(() => { onStuckRef.current = onStuck; }, [onStuck]);
  useEffect(() => { interruptHintRef.current = interruptHint; }, [interruptHint]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);
  useEffect(() => { onTurnSettledRef.current = onTurnSettled; }, [onTurnSettled]);

  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  /**
   * Kept as an alias for the existing call sites: "the silence timer" is the
   * settle timer. `onSpeechEnd` used to cancel it and nothing ever armed it,
   * which is why a turn could sit open indefinitely after the user stopped
   * speaking.
   */
  const clearSilenceTimer = clearSettleTimer;

  /**
   * Clear the "no green word" timer.
   */
  const clearNoGreenWordTimer = useCallback(() => {
    if (noGreenWordTimerRef.current) {
      clearTimeout(noGreenWordTimerRef.current);
      noGreenWordTimerRef.current = null;
    }
    noGreenWordArmedRef.current = false;
    armedVerseIndexRef.current = null;
  }, []);

  const triggerHint = useCallback((verseIndex, transcript = '', payload = null) => {
    if (!onStuckRef.current || isHintPlayingRef.current) return;
    if (hintedVerseIndexRef.current === verseIndex) return;

    // Lock immediately — before any async boundary or further state writes — so
    // a second timer that fires in the same event-loop turn cannot also pass the
    // guard above. JS callbacks are run sequentially, but two setTimeout(0)
    // callbacks CAN both read isHintPlayingRef as false before either writes it.
    isHintPlayingRef.current = true;

    clearStuckTimer();
    clearNoGreenWordTimer();
    hintPassedRef.current = false;
    hintedVerseIndexRef.current = verseIndex;
    mismatchCountRef.current = 0;

    // Snapshot what the user had produced at the moment we decided to help.
    // Without these the "did the retry after the hint succeed?" check in
    // useRecitationWorker had nothing to compare against and never latched.
    hintTranscriptSnapshotRef.current = transcript || '';
    hintPayloadSnapshotRef.current = payload;

    if (import.meta.env.MODE !== 'production') {
      console.log('[HINT TRIGGER]', { verseIndex, reason: 'trigger', mismatchCount: mismatchCountRef.current });
    }
    onStuckRef.current(verseIndex);
  }, [clearStuckTimer, clearNoGreenWordTimer]);

  /**
   * Arm the "no green word" timer for a verse immediately — without needing a
   * worker result to arrive first.
   *
   * `checkGreenWords` only runs when the worker returns a RESULT, so if the
   * user hasn't spoken yet (or the STT model hasn't produced output), the
   * 3-second countdown is never started. This function is called when the
   * user's turn begins so the timer is always armed from turn-start.
   */
  const armNoGreenWordTimer = useCallback((verseIndex) => {
    if (verseIndex === null || verseIndex === undefined || verseIndex < 0) return;
    if (hintedVerseIndexRef.current !== null) return;
    if (isHintPlayingRef.current) return;
    if (armedVerseIndexRef.current === verseIndex) return; // already armed for this verse

    clearNoGreenWordTimer();
    lastCorrectVerseWordIdxRef.current = -1;
    armedVerseIndexRef.current = verseIndex;
    noGreenWordArmedRef.current = true;
    noGreenWordTimerRef.current = setTimeout(() => {
      if (!noGreenWordArmedRef.current || armedVerseIndexRef.current !== verseIndex) return;
      noGreenWordTimerRef.current = null;
      noGreenWordArmedRef.current = false;
      if (import.meta.env.MODE !== 'production') {
        console.log('[NO GREEN WORD STUCK — turn start]', { verseIndex });
      }
      triggerHint(verseIndex, '', latestPayloadRef.current);
    }, NO_GREEN_WORD_DELAY_MS);
    if (import.meta.env.MODE !== 'production') {
      console.log('[NO GREEN WORD ARMED — turn start]', { verseIndex });
    }
  }, [clearNoGreenWordTimer, triggerHint]);

  /**
   * Arm (or re-arm) the stuck countdown for `verseIndex`.
   *
   * Passing `null` disarms it, which is what every non-stuck result does —
   * so the timer measures *uninterrupted* time on a failing verse rather than
   * restarting on each new partial result.
   */
  const armStuckTimer = useCallback((verseIndex, transcript = '', delay = STUCK_HINT_DELAY_MS, matchedIdx) => {
    clearStuckTimer();
    if (verseIndex === null || verseIndex === undefined) return;
    if (hintedVerseIndexRef.current === verseIndex) return;
    // Don't arm the 4s stuck timer when the 3s no-green-word timer is already
    // watching this verse — two independent countdowns racing to the same hint
    // is the source of duplicate triggers.
    if (noGreenWordArmedRef.current && armedVerseIndexRef.current === verseIndex) return;

    const verseRanges = computeVerseWordRanges(ayahWordCounts);
    const currentRange = verseRanges[verseIndex];
    const lastMatched = matchedIdx !== undefined ? matchedIdx : (latestPayloadRef.current?.lastMatchedExpIdx ?? lastMatchedExpIdx ?? -1);
    let effectiveDelay = delay;
    const now = Date.now();

    // Check for progression mismatch: user has aligned speech beyond current verse range
    if (currentRange && lastMatched > currentRange.end) {
      mismatchCountRef.current++;
      if (mismatchCountRef.current >= 2) { // Require persistence across a couple of results
        effectiveDelay = Math.min(delay, PROGRESSION_MISMATCH_DELAY_MS);
      }
    } else {
      mismatchCountRef.current = 0;
      // Track no progress case - stuck on same verse, lastMatched not advancing
      if (lastMatchedAtRef.current.verse === verseIndex && lastMatchedAtRef.current.idx === lastMatched) {
        const stalled = now - lastMatchedAtRef.current.ts;
        if (stalled > 3000) { // No progress for 3s while results keep coming
          effectiveDelay = Math.min(delay, PROGRESSION_MISMATCH_DELAY_MS);
        }
      } else {
        lastMatchedAtRef.current = { idx: lastMatched, verse: verseIndex, ts: now };
      }
    }

    if (import.meta.env.MODE !== 'production') {
      console.log('[HINT ARM]', {
        verseIndex,
        lastMatched,
        currentRangeEnd: currentRange?.end,
        mismatchCount: mismatchCountRef.current,
        effectiveDelay,
        ayahWordCountsLen: ayahWordCounts?.length
      });
    }
    stuckTimerRef.current = setTimeout(() => {
      stuckTimerRef.current = null;
      triggerHint(verseIndex, transcript, latestPayloadRef.current);
    }, effectiveDelay);
  }, [clearStuckTimer, triggerHint, ayahWordCounts, lastMatchedExpIdx]);

  /**
   * Check for new 'correct' (green) words in the results and manage the
   * "no green word" stuck timer.
   *
   * Arms the timer when a verse becomes active. Resets the timer on each new
   * green word within that verse. Fires hint after 3s with no green words.
   *
   * @param {Array} results - Array of word result objects with { word, status, ... }
   * @param {number} verseIndex - Current active verse index (for hint targeting)
   */
  const checkGreenWords = useCallback((results, verseIndex) => {
    if (!results || results.length === 0) return;
    if (hintedVerseIndexRef.current !== null) return; // Don't arm while hint is active
    if (isHintPlayingRef.current) return;
    if (verseIndex === null || verseIndex === undefined || verseIndex < 0) return;

    const verseRanges = verseWordRangesRef.current;
    const currentRange = verseRanges[verseIndex];
    if (!currentRange) return; // Verse has no words (empty ayah)

    const delayMs = stuckTimerDuration * 1000;

    // Check if the active verse has changed
    if (armedVerseIndexRef.current !== verseIndex) {
      // New verse became active — clear stale timer first (it nulls armedVerseIndexRef),
      // then set armedVerseIndexRef to the new verse so the timeout guard can pass.
      clearNoGreenWordTimer();
      lastCorrectVerseWordIdxRef.current = -1;
      armedVerseIndexRef.current = verseIndex;
      noGreenWordArmedRef.current = true;
      noGreenWordTimerRef.current = setTimeout(() => {
        // Guard: verify timer is still armed for this verse
        if (!noGreenWordArmedRef.current || armedVerseIndexRef.current !== verseIndex) return;
        noGreenWordTimerRef.current = null;
        noGreenWordArmedRef.current = false;
        if (import.meta.env.MODE !== 'production') {
          console.log('[NO GREEN WORD STUCK]', { verseIndex, lastCorrectVerseIdx: lastCorrectVerseWordIdxRef.current });
        }
        triggerHint(verseIndex, '', latestPayloadRef.current);
      }, delayMs);
      if (import.meta.env.MODE !== 'production') {
        console.log('[NO GREEN WORD ARMED]', { verseIndex, range: currentRange });
      }
    }

    // Find the highest verse-relative index of a word marked 'correct' in this verse
    let highestVerseCorrectIdx = -1;
    for (let i = currentRange.start; i <= currentRange.end && i < results.length; i++) {
      if (results[i]?.status === 'correct') {
        highestVerseCorrectIdx = i - currentRange.start; // verse-relative index
      }
    }

    // If new green word(s) in this verse, reset the timer
    if (highestVerseCorrectIdx > lastCorrectVerseWordIdxRef.current) {
      lastCorrectVerseWordIdxRef.current = highestVerseCorrectIdx;
      if (noGreenWordArmedRef.current && armedVerseIndexRef.current === verseIndex) {
        // clearNoGreenWordTimer nulls armedVerseIndexRef — re-set it immediately after
        // so the timeout guard (armedVerseIndexRef.current !== verseIndex) can pass.
        clearNoGreenWordTimer();
        armedVerseIndexRef.current = verseIndex;
        noGreenWordArmedRef.current = true;
        noGreenWordTimerRef.current = setTimeout(() => {
          if (!noGreenWordArmedRef.current || armedVerseIndexRef.current !== verseIndex) return;
          noGreenWordTimerRef.current = null;
          noGreenWordArmedRef.current = false;
          if (import.meta.env.MODE !== 'production') {
            console.log('[NO GREEN WORD STUCK]', { verseIndex, lastCorrectVerseIdx: lastCorrectVerseWordIdxRef.current });
          }
          triggerHint(verseIndex, '', latestPayloadRef.current);
        }, delayMs);
        if (import.meta.env.MODE !== 'production') {
          console.log('[NO GREEN WORD RESET]', { verseIndex, highestVerseCorrectIdx });
        }
      }
    }
    // If no new green words, the existing timer (if armed for this verse) will fire on its own
  }, [clearNoGreenWordTimer, triggerHint, stuckTimerDuration]);

  const notifyHintEnded = useCallback(() => {
    const hintedVerse = hintedVerseIndexRef.current;
    isHintPlayingRef.current = false;
    // Allow the hint to repeat: clear the "already hinted" latch so the
    // no-green-word timer can fire again if the user is still stuck.
    hintedVerseIndexRef.current = null;
    // Re-arm the 3-second countdown for the same verse. If the user recites
    // a new green word the timer will be reset; if they don't, the hint plays again.
    if (hintedVerse !== null && hintedVerse !== undefined) {
      clearNoGreenWordTimer();
      lastCorrectVerseWordIdxRef.current = -1; // reset green-word tracker so any new green word extends the window
      armedVerseIndexRef.current = hintedVerse;
      noGreenWordArmedRef.current = true;
      noGreenWordTimerRef.current = setTimeout(() => {
        if (!noGreenWordArmedRef.current || armedVerseIndexRef.current !== hintedVerse) return;
        noGreenWordTimerRef.current = null;
        noGreenWordArmedRef.current = false;
        if (import.meta.env.MODE !== 'production') {
          console.log('[NO GREEN WORD STUCK — repeat]', { verseIndex: hintedVerse });
        }
        triggerHint(hintedVerse, '', latestPayloadRef.current);
      }, stuckTimerDuration * 1000);
      if (import.meta.env.MODE !== 'production') {
        console.log('[NO GREEN WORD RE-ARMED — after hint]', { verseIndex: hintedVerse });
      }
    }
  }, [clearNoGreenWordTimer, triggerHint, stuckTimerDuration]);

  const clearStuckState = useCallback(() => {
    clearStuckTimer();
    clearSettleTimer();
    clearNoGreenWordTimer();
    hintedVerseIndexRef.current = null;
    hintTranscriptSnapshotRef.current = '';
    hintPayloadSnapshotRef.current = null;
    hintPassedRef.current = false;
    isHintPlayingRef.current = false;
    settleFiredRef.current = false;
    mismatchCountRef.current = 0;
    lastMatchedAtRef.current = { idx: -1, verse: -1, ts: Date.now() };
    noProgressMsRef.current = 0;
    lastCorrectVerseWordIdxRef.current = -1;
    armedVerseIndexRef.current = null;
  }, [clearStuckTimer, clearSettleTimer, clearNoGreenWordTimer]);

  /**
   * @param {boolean} shouldSettle - true once the user has recited to the end
   *   of the portion. The timer is armed either way (so it always reports the
   *   end of the quiet period), but only a `true` value produces a settle.
   */
  const armSettleTimer = useCallback((shouldSettle, delay = TURN_SETTLE_DELAY_MS) => {
    // The latch is checked BEFORE clearing, and deliberately so. `checkAutoFinish`
    // latches the same flag and then arms its own 300ms advance on this same
    // timer slot; clearing here would cancel the advance that is already on its
    // way and leave the turn hanging.
    if (settleFiredRef.current) return;
    clearSettleTimer();

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      if (!shouldSettle) return;
      settleFiredRef.current = true;
      onTurnSettledRef.current?.();
    }, delay);
  }, [clearSettleTimer]);

  /**
   * Fast path: every verse in the portion cleared the threshold, so the turn
   * can end immediately without waiting for a silence timeout.
   */
  const checkAutoFinish = useCallback((processedPayload) => {
    if (processedPayload && processedPayload.results && processedPayload.results.length > 0) {
      const { verseStats } = processedPayload;
      latestVerseStatsRef.current = verseStats;

      const allPassed = verseStats && verseStats.length > 0 && verseStats.every(stat =>
        stat.accuracy >= threshold && !stat.hasPending
      );

      if (allPassed) {
        clearStuckTimer();
        clearSettleTimer();
        clearNoGreenWordTimer();
        // Latch so the settle path cannot also fire and stack a retry prompt on
        // top of the advance this schedules.
        settleFiredRef.current = true;
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          onAutoFinishRef.current?.();
        }, 300);
      }
    }
  }, [threshold, clearStuckTimer, clearSettleTimer, clearNoGreenWordTimer]);

  return {
    clearStuckTimer,
    clearSilenceTimer,
    clearSettleTimer,
    clearNoGreenWordTimer,
    armNoGreenWordTimer,
    armStuckTimer,
    armSettleTimer,
    checkGreenWords,
    triggerHint,
    notifyHintEnded,
    clearStuckState,
    checkAutoFinish,
    latestPayloadRef,
    latestVerseStatsRef,
    settleTimerRef,
    interruptHintRef,
    hintedVerseIndexRef,
    hintTranscriptSnapshotRef,
    hintPayloadSnapshotRef,
    hintPassedRef,
    isHintPlayingRef,
  };
};
