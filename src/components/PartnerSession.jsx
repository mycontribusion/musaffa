import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { ResumeBanner } from './partnerConfig/ResumeBanner';
import { useMic } from '../hooks/useMic';
import { useRecitationCheck } from '../hooks/useRecitationCheck';
import { getAudioUrl, buildExpectedText, buildAyahWordCounts } from '../utils/quranUtils';

const PartnerSession = ({
  subView,
  surahs,
  params,
  startMusaffa,
  startQuiz,
  chunks,
  currentChunkIndex,
  currentAyahNumber,
  turn,
  handleNextTurn,
  logStumble,
  setSubView,
  setView,
  // Quiz Props
  questions,
  quizScore,
  quizFeedback,
  handleQuizAnswer,
  currentQuizIndex,
  activeQuizType,
  reciter,
  setReciter,
  handleMusaffaParamChange,
  savedMusaffaSession,
  saveMusaffaSession,
  clearMusaffaSession,
  resumeMusaffaSession,
  pauseMusaffa,
  resumeMusaffa,
  stopMusaffa,
  isPaused,
  audioError,
  setAudioError,
  audioDownloadControls,
  enableErrorDetection,
  quranSimple,
  presetEditingIndex,
  onSavePreset,
  // Prop forwarding only — the delete behaviour lives in usePresets.js.
  onDeletePreset,
  canDeletePreset,
   modelReady,
   modelStatus,
   ensureModelReady,
 }) => {
  // Auto-scroll: fire whenever the active ayah changes (only set during app playback)
  useEffect(() => {
    if (!currentAyahNumber) return;
    const el = document.getElementById(`mudarasa-ayah-${currentAyahNumber}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [currentAyahNumber]);

  // Mic logic for Hands-Free (disabled when error detection is on — STT owns the mic)
  const { currentVolume, isListening } = useMic(
    params.autoNext && !enableErrorDetection && (subView === 'config' || subView === 'mudarasa'),
    params.micSensitivity,
    subView === 'mudarasa' && turn === 'user' ? handleNextTurn : null
  );

  const [retryStartIndex, setRetryStartIndex] = useState(0);
  const [completedResults, setCompletedResults] = useState(null);
  const [isHintActive, setIsHintActive] = useState(false);
  /**
   * Incremented once each time the recogniser reports the user has recited to
   * the end of the portion and stopped. MudarasaView watches this and runs the
   * real finish check (advance if the target was met, otherwise offer retry).
   *
   * A counter rather than a boolean on purpose: the check must be able to fire
   * again for a later portion without being blocked by a flag that is already
   * true.
   */
  const [turnSettledToken, setTurnSettledToken] = useState(0);

  // Reset retryStartIndex and completedResults on chunk index change
  useEffect(() => {
    setRetryStartIndex(0);
    setCompletedResults(null);
  }, [currentChunkIndex]);

  // Build expected text for the current chunk (sliced by retryStartIndex)
  //
  // `activeChunkSlice` is memoised because its identity is load-bearing twice
  // over. It is a dependency of the `grammar` memo in useRecitationCheck, and
  // of the `handleStuck` callback below; `Array.prototype.slice` hands back a
  // fresh array on every render, so leaving it unmemoised produced a new
  // grammar string and a new hint handler several times per second.
  const currentChunk = chunks[currentChunkIndex] || null;
  const activeChunkSlice = useMemo(
    () => (currentChunk ? currentChunk.slice(retryStartIndex) : []),
    [currentChunk, retryStartIndex]
  );
  const expectedText = activeChunkSlice.length > 0 ? buildExpectedText(activeChunkSlice, quranSimple) : '';
  const ayahWordCounts = activeChunkSlice.length > 0 ? buildAyahWordCounts(activeChunkSlice, quranSimple) : [];

  // Declare handleFinishedTurn BEFORE useRecitationCheck so it can be passed as onAutoFinish.
  // We use a ref to avoid stale closure issues with the initial callback registration.
  const handleFinishedTurnRef = useRef(null);

  // hintAudioRef doubles as the "is a hint playing?" guard:
  // non-null means a hint is in progress; null means free to play another.
  const hintAudioRef = useRef(null);
  const hintResumeTimerRef = useRef(null);
  const hintFallbackTimerRef = useRef(null);
  const sttActionsRef = useRef({});
  /**
   * Mirrors `sttActive` for the hint callbacks below.
   *
   * `handleStuck` is defined *before* `sttActive` exists, so it cannot close
   * over the binding directly (that is a temporal-dead-zone read at definition
   * time) and must not list it as a dependency either. A ref is the only way to
   * give it the current value: `handleStuck` decides whether to resume the
   * recogniser after a hint, and resuming it on the app's turn would start the
   * mic listening to the Quran being played back.
   */
  const sttActiveRef = useRef(false);

  const clearResultsRef = useRef(null);

  const interruptHint = useCallback(() => {
    if (hintResumeTimerRef.current) {
      clearTimeout(hintResumeTimerRef.current);
      hintResumeTimerRef.current = null;
    }
    if (hintFallbackTimerRef.current) {
      clearTimeout(hintFallbackTimerRef.current);
      hintFallbackTimerRef.current = null;
    }
    if (hintAudioRef.current) {
      try { hintAudioRef.current.pause(); } catch (e) {}
      hintAudioRef.current = null;
    }
    // Release the hook's authoritative in-flight lock so the trigger paths and
    // the audio element stay in agreement (prevents overlapping hint playback).
    sttActionsRef.current.notifyHintEnded?.();
    setIsHintActive(false);
  }, []);

  const handleStuck = useCallback(async (stuckIndex) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[HINT HANDLER]', { stuckIndex, hasHint: !!hintAudioRef.current, hasVerse: !!activeChunkSlice[stuckIndex] });
    }
    if (hintAudioRef.current || !activeChunkSlice[stuckIndex]) {
      sttActionsRef.current.notifyHintEnded?.();
      return;
    }

    // Set placeholder to prevent concurrent hints while checking cache
    hintAudioRef.current = { pause: () => {} };

    const ayah = activeChunkSlice[stuckIndex];
    const reciterSlug = params.reciter || 'ar.alafasy';
    const url = getAudioUrl(ayah.number, reciterSlug, ayah.surahNumber, ayah.numberInSurah);

    // Pause STT for the first 3 seconds so the hint plays without being cut.
    sttActionsRef.current.pauseRecognition?.();

    let audioSrc = url;
    setIsHintActive(true);
    try {
      if ('caches' in window) {
        const cache = await caches.open('quran-audio-v1');
        const response = await cache.match(url);
        if (response) {
          const blob = await response.blob();
          audioSrc = URL.createObjectURL(blob);
        } else {
          // Pre-fetch so it caches for next time
          fetch(url, { mode: 'no-cors' }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Cache check failed:', e);
    }

    // Double check if interrupted during async cache check
    if (!hintAudioRef.current) return;

    const hintAudio = new Audio(audioSrc);
    hintAudioRef.current = hintAudio;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[HINT PLAY]', { audioSrc: audioSrc.substring(0, 60) });
    }
    hintAudio.play().catch(e => {
      console.warn('Failed to play hint audio:', e);
      setAudioError(true);
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
    });

    // Resume when audio ends; fallback in case onended/onerror never fire
    hintFallbackTimerRef.current = setTimeout(() => {
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
    }, 8000);

    hintAudio.onended = () => {
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
    };
    hintAudio.onerror = () => {
      setAudioError(true);
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
    };
  }, [activeChunkSlice, params.reciter, interruptHint, setAudioError]);

  // STT error detection — active during user's recitation turn only
  // onAutoFinish fires automatically after silence, triggering handleFinishedTurn
  const sttActive = !!(enableErrorDetection && subView === 'mudarasa' && turn === 'user');
  // Synced post-commit rather than during render: this is an input to committed
  // work (the hint timers), not render output, and a render that gets thrown
  // away must not advance it.
  useEffect(() => { sttActiveRef.current = sttActive; }, [sttActive]);

   const {
      isSupported: sttSupported,
      transcript,
      liveResults,
      results: recitationResults,
      stopAndCheck,
      clearResults,
      resetTurn,
      pauseRecognition,
      resumeRecognition,
      notifyHintEnded,
      clearTranscript,
    } = useRecitationCheck(
      sttActive,
      expectedText,
      useCallback(() => { handleFinishedTurnRef.current?.(); }, []),
      params.errorThreshold ?? 50,
      ayahWordCounts,
      handleStuck,
      interruptHint,
      null,
      // The user recited to the end of the portion and then went quiet.
      // MudarasaView decides what that means; all this does is raise the token.
      () => setTurnSettledToken((n) => n + 1),
      modelReady,
      modelStatus,
      ensureModelReady,
      activeChunkSlice,
      quranSimple
    );

  sttActionsRef.current = { pauseRecognition, resumeRecognition, notifyHintEnded };

  useEffect(() => {
    clearResultsRef.current = clearResults;
  }, [clearResults]);

  const autoAdvanceTimerRef = useRef(null);

  /**
   * `handleFinishedTurn` is memoised without `liveResults` in its deps, so the
   * copy it read was whichever one existed when the memo was last rebuilt —
   * potentially many worker updates ago. `completedResults` is what renders the
   * final per-word colouring of the portion the user just recited, so a stale
   * snapshot showed them the marking for an earlier state of their own turn.
   */
  const liveResultsRef = useRef(liveResults);
  useEffect(() => { liveResultsRef.current = liveResults; }, [liveResults]);

  // When feedback card "Continue" is clicked, clear and advance turn
  const handleContinueAfterFeedback = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearResults();
    handleNextTurn();
  }, [clearResults, handleNextTurn]);

  // Called when 100% accuracy is confirmed OR user taps "Tap to finish early"
  const handleFinishedTurn = useCallback(() => {
    if (enableErrorDetection && sttSupported) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      stopAndCheck();
      // Advance immediately — if triggered by auto-finish, 100% is already confirmed.
      // If triggered manually, we give a brief moment for final comparison to log.
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCompletedResults(liveResultsRef.current);
        clearResults();
        handleNextTurn();
      }, 200);
    } else {
      handleNextTurn();
    }
  }, [enableErrorDetection, sttSupported, stopAndCheck, clearResults, handleNextTurn]);

  // Keep the ref in sync so the onAutoFinish closure always calls the latest version
  handleFinishedTurnRef.current = handleFinishedTurn;

  // Cleanup timers and audio on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      interruptHint();
    };
  }, [interruptHint]);

   // Stop hint audio if the turn changes or we exit Mudarasa view
   useEffect(() => {
     if (!sttActive) {
       interruptHint();
     }
   }, [sttActive, interruptHint]);

   // Clear the speech transcript when the app takes its turn
   // (audio playback / prompt). This ensures the user's next
   // recitation starts with a clean slate instead of carrying
   // over stale partial or confirmed text from the previous turn.
   useEffect(() => {
     if (turn === 'app') {
       clearTranscript();
     }
   }, [turn, clearTranscript]);

  // Automatically log stumbles and store recitation history in localStorage when results are computed
  useEffect(() => {
    if (recitationResults && recitationResults.results) {
      const hasErrors = recitationResults.results.some(r => r.status === 'omission' || r.status === 'substitution');
      if (hasErrors) {
        const chunk = chunks[currentChunkIndex];
        if (chunk) {
          chunk.forEach(ayah => {
            logStumble(ayah);
          });
        }
      }

      // Store the recitation attempt feedback in localStorage history
      try {
        const history = JSON.parse(localStorage.getItem('quran_recitation_history') || '[]');
        const newRecord = {
          date: new Date().toISOString(),
          surahNumber: chunks[currentChunkIndex]?.[0]?.surahNumber,
          chunkIndex: currentChunkIndex,
          accuracy: recitationResults.accuracy,
          breakdown: recitationResults.breakdown,
          expectedText: buildExpectedText(chunks[currentChunkIndex], quranSimple),
          transcript: transcript,
        };
        localStorage.setItem('quran_recitation_history', JSON.stringify([newRecord, ...history].slice(0, 100)));
      } catch (e) {
        console.error('Failed to save recitation history:', e);
      }
    }
  }, [recitationResults, currentChunkIndex, chunks, logStumble, transcript, quranSimple]);

  // Dispatcher
  if (subView === 'config') return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.5rem 0.5rem 6rem' }}>
      {/* Resume is only offered on the plain config screen.

          `presetEditingIndex !== null` is the single source of truth for "a preset
          is open" and it covers BOTH preset routes — `editPreset(index)` and
          `createPreset()` (which appends and opens the editor at that index). The
          previous `!presetEditingIndex` test was falsy for index 0, so editing the
          first preset still showed the banner. Nothing else about Resume changes:
          the saved session, its persistence and both handlers are untouched, and
          the plain Musaffa config (`presetEditingIndex === null`) is unchanged. */}
      {presetEditingIndex === null && (
        <ResumeBanner
          savedSession={savedMusaffaSession}
          onResume={resumeMusaffaSession}
          onDismiss={clearMusaffaSession}
        />
      )}
      <PartnerConfig
        key="config"
        surahs={surahs}
        params={params}
        onChange={handleMusaffaParamChange}
        onStart={(overrideChunks) => {
          saveMusaffaSession();
          startMusaffa(overrideChunks);
        }}
        onBack={() => setView('list')}
        currentVolume={currentVolume}
        isListening={isListening}
        reciter={reciter}
        setReciter={setReciter}
        audioDownloadControls={audioDownloadControls}
        sttSupported={sttSupported}
        presetEditingIndex={presetEditingIndex}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
        canDeletePreset={canDeletePreset}
      />
    </div>
  );

  if (subView === 'mudarasa' && chunks[currentChunkIndex]) return (
      <MudarasaView
      key="mudarasa"
      chunks={chunks}
      currentChunkIndex={currentChunkIndex}
      currentAyahNumber={currentAyahNumber}
      mudarasaTurn={turn}
      onNext={handleNextTurn}
      onBack={() => { saveMusaffaSession(); stopMusaffa(); setSubView('config'); }}
      onLogStumble={logStumble}
      isListening={isListening}
      currentVolume={currentVolume}
      sensitivity={params.micSensitivity}
      isPaused={isPaused}
      onPause={pauseMusaffa}
      onResume={resumeMusaffa}
      audioError={audioError}
      setAudioError={setAudioError}
      enableErrorDetection={enableErrorDetection && sttSupported}
      liveResults={liveResults}
      transcript={transcript}
      onFinishedTurn={handleFinishedTurn}
      onRetryTurn={resetTurn}
      turnSettledToken={turnSettledToken}
      quranSimple={quranSimple}
      targetAccuracy={params.errorThreshold ?? 50}
      retryStartIndex={retryStartIndex}
      setRetryStartIndex={setRetryStartIndex}
      completedResults={completedResults}
      isHintActive={isHintActive}
    />
  );

  if (subView === 'quiz' || subView === 'quiz-result') return (
    <QuizEngine 
      key="quiz-engine"
      subView={subView}
      questions={questions}
      currentQuizIndex={currentQuizIndex}
      quizScore={quizScore}
      quizFeedback={quizFeedback}
      handleQuizAnswer={handleQuizAnswer}
      startQuiz={startQuiz}
      setView={setView}
      setPartnerSubView={setSubView}
      activeQuizType={activeQuizType}
    />
  );

  /* `subView === 'mudarasa'` with no active chunk means there is nothing to
     recite: `chunks` only lives in memory, so it is empty after a reload. A
     refresh on a session URL no longer reaches here — `syncStateWithURL` sends
     it to `config`, where ResumeBanner resumes the saved session in one tap —
     so this is only a safety net for the remaining ways in. It used to fall
     through to `return null`, and since `mudarasa` hides the global header
     that was a completely blank page with no way out. */
  if (subView === 'mudarasa') return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '3rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.25rem',
      textAlign: 'center',
      color: 'var(--text-secondary)',
    }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Session ended
      </h1>
      <p style={{ lineHeight: 1.5 }}>
        This recitation session is no longer running. Start a new one from the
        configuration screen.
      </p>
      <button
        type="button"
        onClick={() => setSubView('config')}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'var(--gold-gradient)',
          color: 'var(--text-on-gold)',
          borderRadius: '0.75rem',
          fontWeight: 'var(--fw-strong)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Open Musaffa config
      </button>
    </div>
  );

  return null;
};

export default PartnerSession;
