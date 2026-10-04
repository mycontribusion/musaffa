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
export const STUCK_HINT_DELAY_MS = 7000;

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

export const useStuckDetection = ({
  onStuck,
  interruptHint,
  onAutoFinish,
  onTurnSettled,
  threshold,
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

  const triggerHint = useCallback((verseIndex, transcript = '', payload = null) => {
    if (!onStuckRef.current || isHintPlayingRef.current) return;
    if (hintedVerseIndexRef.current === verseIndex) return;

    clearStuckTimer();
    isHintPlayingRef.current = true;
    hintPassedRef.current = false;
    hintedVerseIndexRef.current = verseIndex;

    // Snapshot what the user had produced at the moment we decided to help.
    // Without these the "did the retry after the hint succeed?" check in
    // useRecitationWorker had nothing to compare against and never latched.
    hintTranscriptSnapshotRef.current = transcript || '';
    hintPayloadSnapshotRef.current = payload;

    onStuckRef.current(verseIndex);
  }, [clearStuckTimer]);

  /**
   * Arm (or re-arm) the stuck countdown for `verseIndex`.
   *
   * Passing `null` disarms it, which is what every non-stuck result does —
   * so the timer measures *uninterrupted* time on a failing verse rather than
   * restarting on each new partial result.
   */
  const armStuckTimer = useCallback((verseIndex, transcript = '', delay = STUCK_HINT_DELAY_MS) => {
    clearStuckTimer();
    if (verseIndex === null || verseIndex === undefined) return;
    if (hintedVerseIndexRef.current === verseIndex) return;

    stuckTimerRef.current = setTimeout(() => {
      stuckTimerRef.current = null;
      triggerHint(verseIndex, transcript, latestPayloadRef.current);
    }, delay);
  }, [clearStuckTimer, triggerHint]);

  const notifyHintEnded = useCallback(() => {
    isHintPlayingRef.current = false;
  }, []);

  const clearStuckState = useCallback(() => {
    clearStuckTimer();
    clearSettleTimer();
    hintedVerseIndexRef.current = null;
    hintTranscriptSnapshotRef.current = '';
    hintPayloadSnapshotRef.current = null;
    hintPassedRef.current = false;
    isHintPlayingRef.current = false;
    settleFiredRef.current = false;
  }, [clearStuckTimer, clearSettleTimer]);

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
        // Latch so the settle path cannot also fire and stack a retry prompt on
        // top of the advance this schedules.
        settleFiredRef.current = true;
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          onAutoFinishRef.current?.();
        }, 300);
      }
    }
  }, [threshold, clearStuckTimer, clearSettleTimer]);

  return {
    clearStuckTimer,
    clearSilenceTimer,
    clearSettleTimer,
    armStuckTimer,
    armSettleTimer,
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
