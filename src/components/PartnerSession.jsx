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

// Diagnostic: log turn changes
useEffect(() => {
  log('TURN CHANGED:', turn);
}, [turn]);

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
  const transcriptRef = useRef('');
  // Track STT active state with a ref to avoid stale closures in async handlers.
  const sttActiveRef = useRef(false);
  // Proxy ref for hintedVerseIndexRef so handleStuck (defined before useRecitationCheck)
  // can access it without a stale-closure "accessed before declared" lint error.
  const hintedVerseIndexRefProxy = useRef(null);

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
      try { hintAudioRef.current.pause(); } catch { /* ignore pause errors */ }
      hintAudioRef.current = null;
    }
    // Release the hook's authoritative in-flight lock so the trigger paths and
    // the audio element stay in agreement (prevents overlapping hint playback).
    sttActionsRef.current.notifyHintEnded?.();
    // Resume STT so the user can keep reciting after an interrupted hint.
    sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
  }, []);

  const handleStuck = useCallback(async (stuckIndex) => {
    log('handleStuck called for verse:', stuckIndex, 'hintAudioRef.current:', !!hintAudioRef.current);
    // Guard: do not play a hint if it's not the user's turn.
    if (turn !== 'user') {
      log('handleStuck bailing out - not user turn');
      return;
    }
    // Guard: do not play a new hint if one is already playing for the same verse.
    // If a hint is playing for a DIFFERENT verse, interrupt it first.
    if (hintAudioRef.current) {
      if (hintedVerseIndexRefProxy?.current === stuckIndex) {
        log('handleStuck bailing out - hint already playing for same verse:', stuckIndex);
        return;
      }
      log('handleStuck interrupting existing hint for different verse');
      interruptHint();
    }
    if (!activeChunkSlice[stuckIndex]) {
      log('handleStuck bailing out - no ayah');
      return;
    }

    const ayah = activeChunkSlice[stuckIndex];
    const reciterSlug = params.reciter || 'ar.alafasy';
    const url = getAudioUrl(ayah.number, reciterSlug, ayah.surahNumber, ayah.numberInSurah);
    log('Playing hint audio for ayah:', ayah.number, 'url:', url);

    // Pause STT while hint plays so the hint audio is not cut off.
    sttActionsRef.current.pauseRecognition?.();

    let blobUrl = null;
    let audioSrc = url;

    // ── Local-First Audio Resolution ─────────────────────────────────────
    // 1. Check Cache API (quran-audio-v1) for a cached blob.
    // 2. If cached, play instantly from blob:// URL.
    // 3. If not cached and online, stream from network.
    // 4. If not cached and offline, skip gracefully — no "Audio Unavailable" modal.
    try {
      blobUrl = await getCachedAudioBlobUrl(url);
      if (blobUrl) {
        audioSrc = blobUrl;
        log('Playing hint from cached blob:', blobUrl);
      } else if (navigator.onLine) {
        log('Playing hint from network:', url);
      } else {
        // Offline and not cached — skip gracefully, keep STT active.
        log('Hint audio not cached and offline — skipping, resuming STT');
        sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
        return;
      }
    } catch (e) {
      log('Error resolving hint audio:', e);
      if (!navigator.onLine) {
        sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
        return;
      }
      // If online but cache check failed, fall through to network stream.
    }

    const hintAudio = new Audio(audioSrc);
    hintAudioRef.current = hintAudio;

    const finishHint = () => {
      log('Hint ended, resuming STT and notifying hint ended');
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      hintAudioRef.current = null;
      // Reset all hint evaluation refs in useStuckDetection.
      sttActionsRef.current.notifyHintEnded?.();
      // Immediately re-arm speech recognition so accuracy scoring continues.
      sttActionsRef.current.resumeRecognition?.(sttActiveRef.current);
    };

    hintAudio.onended = () => {
      log('Hint audio onended');
      finishHint();
    };
    hintAudio.onerror = (e) => {
      log('Hint audio onerror:', e);
      finishHint();
    };

    try {
      await hintAudio.play();
      log('Hint audio started playing');
    } catch (e) {
      log('Failed to play hint audio:', e);
      setAudioError(true);
      finishHint();
    }
  }, [activeChunkSlice, params.reciter, interruptHint, setAudioError, turn]);

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
    hintedVerseIndexRef,
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
  sttActiveRef.current = !!(enableErrorDetection && subView === 'mudarasa' && turn === 'user');
  hintedVerseIndexRefProxy.current = hintedVerseIndexRef;

  useEffect(() => {
    clearResultsRef.current = clearResults;
  }, [clearResults]);

  const autoAdvanceTimerRef = useRef(null);

  // When feedback card "Continue" is clicked, clear and advance turn
  const handleContinueAfterFeedback = useCallback(() => {
    log('handleContinueAfterFeedback');
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearResults();
    handleNextTurn();
  }, [clearResults, handleNextTurn]);

  // Called when 100% accuracy is confirmed OR user taps "Tap to finish early"
  const handleFinishedTurn = useCallback(() => {
    log('handleFinishedTurn', { enableErrorDetection, sttSupported, turn });
    if (enableErrorDetection && sttSupported) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      stopAndCheck();
      interruptHint();
      clearResults(); // Synchronously flushes worker results and pending IDs
      
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCompletedResults(null); // Ensure no stale result payload persists
        handleNextTurn();
      }, 200);
    } else {
      handleNextTurn();
    }
  }, [enableErrorDetection, sttSupported, stopAndCheck, interruptHint, clearResults, handleNextTurn]);

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
