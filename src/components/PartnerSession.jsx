import { useEffect, useCallback, useRef, useState } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { ResumeBanner } from './partnerConfig/ResumeBanner';
import { useMic } from '../hooks/useMic';
import { useRecitationCheck } from '../hooks/useRecitationCheck';
import { getAudioUrl, buildExpectedText, buildAyahWordCounts } from '../utils/quranUtils';

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
      hintAudioRef.current = null;
    }
    // Release the hook's authoritative in-flight lock so the trigger paths and
    // the audio element stay in agreement (prevents overlapping hint playback).
    sttActionsRef.current.notifyHintEnded?.();
  }, []);

  const handleStuck = useCallback((stuckIndex) => {
    log('handleStuck called for verse:', stuckIndex, 'hintAudioRef.current:', !!hintAudioRef.current);
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
    hintStartTranscriptLengthRef.current = transcript.length;

    // Pause STT for the first 3 seconds so the hint plays without being cut.
    sttActionsRef.current.pauseRecognition?.();

    const hintAudio = new Audio(url);
    hintAudioRef.current = hintAudio;
    hintAudio.play().then(() => {
      log('Hint audio started playing');
    }).catch(e => {
      log('Failed to play hint audio:', e);
      setAudioError(true);
      interruptHint();
      sttActionsRef.current.resumeRecognition?.();
    });

    // After 3 seconds, decide based on whether the user spoke:
    // - If transcript grew → user spoke during the 3-sec window.
    //   Stop hint, rescore with user's speech, continue.
    // - If transcript did not grow → user was silent.
    //   Let the hint finish playing the full verse, then rescore as if
    //   the user repeated it (100%) and continue.
    hintResumeTimerRef.current = setTimeout(() => {
      const userSpoke = transcript.length > hintStartTranscriptLengthRef.current;
      log('Hint 3-sec timer fired, userSpoke:', userSpoke, 'transcript length:', transcript.length, 'start length:', hintStartTranscriptLengthRef.current);
      if (userSpoke) {
        // User spoke during the 3-second window — stop hint, rescore, continue
        log('User spoke during hint — stopping and rescoring');
        interruptHint();
        sttActionsRef.current.dispatchFinalCompare?.(transcript);
        handleFinishedTurnRef.current?.();
      } else {
        // User was silent — do NOT resume STT; let the hint audio finish
        // playing the full verse. The onended handler will rescore and continue.
        log('User was silent during hint — letting audio finish');
      }
    }, 3000);

    // 5-second fallback in case onended/onerror never fire due to network hang
    hintFallbackTimerRef.current = setTimeout(() => {
      log('Hint fallback timer fired, interrupting hint');
      interruptHint();
      const userSpoke = transcript.length > hintStartTranscriptLengthRef.current;
      if (!userSpoke) {
        // No speech detected — rescore as if user repeated the verse (100%)
        // and continue the session.
        log('Fallback: no speech detected, rescoring with expected text');
        sttActionsRef.current.dispatchFinalCompare?.(expectedText);
        handleFinishedTurnRef.current?.();
      } else {
        // User spoke — rescore with their speech and continue
        log('Fallback: user spoke, rescoring with transcript');
        sttActionsRef.current.dispatchFinalCompare?.(transcript);
        handleFinishedTurnRef.current?.();
      }
      sttActionsRef.current.resumeRecognition?.();
    }, 5000);

    const finishHint = () => {
      const userSpoke = transcript.length > hintStartTranscriptLengthRef.current;
      if (!userSpoke) {
        // No speech detected — rescore as if user repeated the verse (100%)
        // and continue the session.
        log('Hint ended naturally, no speech detected, rescoring with expected text');
        sttActionsRef.current.dispatchFinalCompare?.(expectedText);
        handleFinishedTurnRef.current?.();
      } else {
        // User spoke — rescore with their speech and continue
        log('Hint ended, user spoke, rescoring with transcript');
        sttActionsRef.current.dispatchFinalCompare?.(transcript);
        handleFinishedTurnRef.current?.();
      }
      interruptHint();
      sttActionsRef.current.resumeRecognition?.();
    };

    hintAudio.onended = () => {
      log('Hint audio onended');
      finishHint();
    };
    hintAudio.onerror = (e) => {
      log('Hint audio onerror:', e);
      setAudioError(true);
      finishHint();
    };
  }, [activeChunkSlice, params.reciter, interruptHint, setAudioError, expectedText, transcript]);

  // STT error detection — active during user's recitation turn only
  // onAutoFinish fires automatically after silence, triggering handleFinishedTurn
  const sttActive = !!(enableErrorDetection && subView === 'mudarasa' && turn === 'user');
  const {
    isSupported: sttSupported,
    isListening: isSttListening,
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
    interruptHint
  );

  sttActionsRef.current = { pauseRecognition, resumeRecognition, notifyHintEnded };

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
      // Advance immediately — if triggered by auto-finish, 100% is already confirmed.
      // If triggered manually, we give a brief moment for final comparison to log.
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCompletedResults(liveResults);
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
