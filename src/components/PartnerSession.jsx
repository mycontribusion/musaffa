import { useEffect, useCallback, useRef, useState } from 'react';
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
    hintAudio.play().catch(e => {
      console.warn('Failed to play hint audio:', e);
      setAudioError(true);
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActive);
    });

    // Resume STT after 3 seconds regardless of whether audio is still playing
    hintResumeTimerRef.current = setTimeout(() => {
      sttActionsRef.current.resumeRecognition?.(sttActive);
    }, 3000);

    // 5-second fallback in case onended/onerror never fire due to network hang
    hintFallbackTimerRef.current = setTimeout(() => {
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActive);
    }, 5000);

    hintAudio.onended = () => {
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActive);
    };
    hintAudio.onerror = () => {
      setAudioError(true);
      interruptHint();
      sttActionsRef.current.resumeRecognition?.(sttActive);
    };
  }, [activeChunkSlice, params.reciter, interruptHint, setAudioError]);

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

  return null;
};

export default PartnerSession;
