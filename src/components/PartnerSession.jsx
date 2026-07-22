import { useEffect, useCallback, useRef, useState } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { ResumeBanner } from './partnerConfig/ResumeBanner';
import { useMic } from '../hooks/useMic';
import { useRecitationCheck } from '../hooks/useRecitationCheck';
import { getAudioUrl, buildExpectedText, buildAyahWordCounts, getCachedAudioBlobUrl } from '../utils/quranUtils';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[PartnerSession]', ...args); };

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

  // Reset retryStartIndex and completedResults on chunk index change
  useEffect(() => {
    setRetryStartIndex(0);
    setCompletedResults(null);
  }, [currentChunkIndex]);

  // Build expected text for the current chunk (sliced by retryStartIndex)
  const currentChunk = chunks[currentChunkIndex] || null;
  const activeChunkSlice = currentChunk ? currentChunk.slice(retryStartIndex) : [];
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
  const hintStartTranscriptLengthRef = useRef(0);
  const transcriptRef = useRef('');

  const clearResultsRef = useRef(null);

  const interruptHint = useCallback(() => {
    log('interruptHint called');
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
      if (hintAudioRef.current._blobUrlToRevoke) {
        URL.revokeObjectURL(hintAudioRef.current._blobUrlToRevoke);
      }
      hintAudioRef.current = null;
    }
    // Release the hook's authoritative in-flight lock so the trigger paths and
    // the audio element stay in agreement (prevents overlapping hint playback).
    sttActionsRef.current.notifyHintEnded?.();
  }, []);

  const handleStuck = useCallback(async (stuckIndex) => {
    log('handleStuck called for verse:', stuckIndex, 'hintAudioRef.current:', !!hintAudioRef.current);
    // Guard: do not play a hint if it's not the user's turn.
    if (turn !== 'user') {
      log('handleStuck bailing out - not user turn');
      return;
    }
    // Guard: do not play a new hint if one is already playing.
    // If we bail out here we must NOT release the hook's in-flight lock,
    // because a hint IS actually playing. Releasing it would allow the
    // stuck timer to fire again and potentially overlap hints.
    if (hintAudioRef.current || !activeChunkSlice[stuckIndex]) {
      log('handleStuck bailing out - hint already playing or no ayah');
      return;
    }

    const ayah = activeChunkSlice[stuckIndex];
    const reciterSlug = params.reciter || 'ar.alafasy';
    const url = getAudioUrl(ayah.number, reciterSlug, ayah.surahNumber, ayah.numberInSurah);
    log('Playing hint audio for ayah:', ayah.number, 'url:', url);

    // Save the transcript length at the start of the hint so we can detect
    // whether the user spoke during the 3-second window.
    hintStartTranscriptLengthRef.current = transcriptRef.current.length;

    // Pause STT for the first 3 seconds so the hint plays without being cut.
    sttActionsRef.current.pauseRecognition?.();

    // ── Local-first audio resolver ─────────────────────────────────────────
    let audioSrc = url;
    let blobUrlToRevoke = null;

    try {
      const cachedBlobUrl = await getCachedAudioBlobUrl(url);
      if (cachedBlobUrl) {
        audioSrc = cachedBlobUrl;
        blobUrlToRevoke = cachedBlobUrl;
        log('Hint audio found in local cache, using blob URL');
      } else if (!navigator.onLine) {
        log('Hint audio not cached and network unavailable — skipping hint');
        finishHint();
        return;
      }
    } catch (e) {
      log('Cache check failed, falling back to network:', e);
      if (!navigator.onLine) {
        log('Network unavailable after cache check failure — skipping hint');
        finishHint();
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const hintAudio = new Audio(audioSrc);
    hintAudioRef.current = hintAudio;
    hintAudio._blobUrlToRevoke = blobUrlToRevoke;
    // Track whether .play() was explicitly attempted so we only show the
    // "Audio Unavailable" modal for genuine play failures, not for silent
    // background preload/buffering errors.
    let playAttempted = false;
    hintAudio.play().then(() => {
      log('Hint audio started playing');
    }).catch(e => {
      playAttempted = true;
      log('Failed to play hint audio:', e);
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
      setAudioError(true);
      interruptHint();
      log('Calling resumeRecognition after hint play error, sttActive:', sttActive);
      sttActionsRef.current.resumeRecognition?.(sttActive);
    });

    // After 3 seconds, decide based on whether the user spoke:
    // - If transcript grew → user spoke during the 3-sec window.
    //   Stop hint, resume STT, and let the normal scoring loop continue.
    // - If transcript did not grow → user was silent.
    //   Let the hint finish playing the full verse, then resume STT
    //   and let the normal scoring loop continue.
    hintResumeTimerRef.current = setTimeout(() => {
      const userSpoke = transcriptRef.current.length > hintStartTranscriptLengthRef.current;
      log('Hint 3-sec timer fired, userSpoke:', userSpoke, 'transcript length:', transcriptRef.current.length, 'start length:', hintStartTranscriptLengthRef.current);
      if (userSpoke) {
        // User spoke during the 3-second window — stop hint and resume STT
        log('User spoke during hint — stopping hint and resuming STT');
        interruptHint();
        log('Calling resumeRecognition after 3-sec timer (user spoke), sttActive:', sttActive);
        sttActionsRef.current.resumeRecognition?.(sttActive);
      } else {
        // User was silent — do NOT resume STT yet; let the hint audio finish
        // playing the full verse. The onended handler will resume STT.
        log('User was silent during hint — letting audio finish');
      }
    }, 3000);

    // 5-second fallback in case onended/onerror never fire due to network hang
    hintFallbackTimerRef.current = setTimeout(() => {
      log('Hint fallback timer fired, interrupting hint');
      interruptHint();
      log('Calling resumeRecognition from fallback timer, sttActive:', sttActive);
      sttActionsRef.current.resumeRecognition?.(sttActive);
    }, 5000);

    const finishHint = () => {
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
      // Always resume STT and restart the stuck timer when the hint ends.
      // The normal scoring loop will evaluate the user's transcript and
      // auto-advance if they meet the threshold, or trigger another hint
      // if they're still stuck.
      log('Hint ended, resuming STT and restarting stuck timer');
      interruptHint();
      log('Calling resumeRecognition from finishHint, sttActive:', sttActive);
      sttActionsRef.current.resumeRecognition?.(sttActive);
    };

    hintAudio.onended = () => {
      log('Hint audio onended');
      finishHint();
    };
    hintAudio.onerror = (e) => {
      log('Hint audio onerror:', e);
      // Only surface the "Audio Unavailable" modal if .play() was actually
      // attempted. Preload/buffering errors during idle setup are suppressed.
      if (playAttempted) {
        setAudioError(true);
      }
      finishHint();
    };
  }, [activeChunkSlice, params.reciter, interruptHint, setAudioError, expectedText, turn]);

  // STT error detection — active during user's recitation turn only
  // onAutoFinish fires automatically after silence, triggering handleFinishedTurn
  const sttActive = !!(enableErrorDetection && subView === 'mudarasa' && turn === 'user');
  const {
    isSupported: sttSupported,
    isListening: isSttListening,
    sttStatus,
    transcript,
    liveResults,
    results: recitationResults,
    stopAndCheck,
    clearResults,
    pauseRecognition,
    resumeRecognition,
    notifyHintEnded,
  } = useRecitationCheck(
    sttActive,
    expectedText,
    useCallback(() => { handleFinishedTurnRef.current?.(); }, []),
    params.errorThreshold ?? 50,
    ayahWordCounts,
    handleStuck,
    interruptHint,
    turn
  );

  sttActionsRef.current = { pauseRecognition, resumeRecognition, notifyHintEnded };
  transcriptRef.current = transcript;

  useEffect(() => {
    clearResultsRef.current = clearResults;
  }, [clearResults]);

  const autoAdvanceTimerRef = useRef(null);

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
      // Immediately stop any hint audio and clear worker results to prevent
      // out-of-turn scoring and audio overlap during the 200ms transition.
      interruptHint();
      clearResults();
      // Advance immediately — if triggered by auto-finish, 100% is already confirmed.
      // If triggered manually, we give a brief moment for final comparison to log.
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCompletedResults(liveResults);
        handleNextTurn();
      }, 200);
    } else {
      handleNextTurn();
    }
  }, [enableErrorDetection, sttSupported, stopAndCheck, interruptHint, clearResults, handleNextTurn, liveResults]);

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
      {!presetEditingIndex && (
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
      isSttListening={isSttListening}
      sttStatus={sttStatus}
      liveResults={liveResults}
      transcript={transcript}
      onFinishedTurn={handleFinishedTurn}
      onRetryTurn={clearResults}
      quranSimple={quranSimple}
      targetAccuracy={params.errorThreshold ?? 50}
      retryStartIndex={retryStartIndex}
      setRetryStartIndex={setRetryStartIndex}
      completedResults={completedResults}
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

  return null;
};

export default PartnerSession;
