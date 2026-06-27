import { useEffect, useCallback, useRef, useState } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { useMic } from '../hooks/useMic';
import { useRecitationCheck } from '../hooks/useRecitationCheck';
import { removeTashkeel, normalizeArabic, expandMuqattaat, getAudioUrl } from '../utils/quranUtils';

/**
 * Build expected text for the current chunk by concatenating ayah texts.
 * Uses quranSimple (plain text) for error-detection comparison when available,
 * ensuring the exact same surah|ayah is used for comparison as shown on screen.
 * Falls back to quranAr text if quranSimple is not loaded.
 */
const buildExpectedText = (chunk, quranSimple) => {
  if (!chunk || chunk.length === 0) return '';
  return chunk.map(ayah => {
    let text = ayah.text || '';
    if (quranSimple) {
      const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
      const simpleText = quranSimple[key];
      if (simpleText) text = simpleText;
    }
    const clean = removeTashkeel(text);
    return normalizeArabic(expandMuqattaat(clean));
  }).join(' ');
};

/**
 * Returns the number of words each ayah contributes to the expected text,
 * using the same text source as buildExpectedText. Used by the worker to
 * check per-verse minimum accuracy (each ayah must be ≥50% correct).
 */
const buildAyahWordCounts = (chunk, quranSimple) => {
  if (!chunk || chunk.length === 0) return [];
  return chunk.map(ayah => {
    let text = ayah.text || '';
    if (quranSimple) {
      const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
      const simpleText = quranSimple[key];
      if (simpleText) text = simpleText;
    }
    const clean = removeTashkeel(text);
    const expanded = normalizeArabic(expandMuqattaat(clean));
    return expanded.trim().split(/\s+/).filter(Boolean).length;
  });
};

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

  // Reset retryStartIndex on chunk index change
  useEffect(() => {
    setRetryStartIndex(0);
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

  const clearResultsRef = useRef(null);

  const handleStuck = useCallback((stuckIndex) => {
    // Guard: do not play a new hint if one is already playing
    if (hintAudioRef.current || !activeChunkSlice[stuckIndex]) return;

    const ayah = activeChunkSlice[stuckIndex];
    const reciterSlug = params.reciter || 'ar.alafasy';
    const url = getAudioUrl(ayah.number, reciterSlug, ayah.surahNumber, ayah.numberInSurah);

    // Pause STT for the first 3 seconds so the hint plays without being cut.
    // After 3s, recognition resumes — user speech can then naturally interrupt the audio.
    pauseRecognition();

    const hintAudio = new Audio(url);
    hintAudioRef.current = hintAudio;
    hintAudio.play().catch(e => console.warn('Failed to play hint audio:', e));

    // Resume STT after 3 seconds regardless of whether audio is still playing
    const resumeTimer = setTimeout(() => {
      resumeRecognition();
    }, 3000);

    hintAudio.onended = () => {
      clearTimeout(resumeTimer);
      hintAudioRef.current = null;
      resumeRecognition();
    };
    hintAudio.onerror = () => {
      clearTimeout(resumeTimer);
      hintAudioRef.current = null;
      resumeRecognition();
    };
  }, [activeChunkSlice, params.reciter, retryStartIndex, pauseRecognition, resumeRecognition]);

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
  } = useRecitationCheck(
    sttActive,
    expectedText,
    useCallback(() => { handleFinishedTurnRef.current?.(); }, []),
    params.errorThreshold ?? 50,
    ayahWordCounts,
    handleStuck,
    hintAudioRef    // interrupt hint audio the moment user starts speaking
  );

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
        clearResults();
        handleNextTurn();
      }, 200);
    } else {
      handleNextTurn();
    }
  }, [enableErrorDetection, sttSupported, stopAndCheck, clearResults, handleNextTurn]);

  // Keep the ref in sync so the onAutoFinish closure always calls the latest version
  handleFinishedTurnRef.current = handleFinishedTurn;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

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
      {/* Resume Session Banner — hidden when editing a preset */}
      {savedMusaffaSession && !presetEditingIndex && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginBottom: '1rem',
          gap: '0.75rem',
        }}>
          <div>
            <p style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>Resume Session?</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              {savedMusaffaSession.surahNumber
                ? `Surah ${savedMusaffaSession.surahNumber} · Chunk ${savedMusaffaSession.chunkIndex + 1}`
                : 'Continue from where you left off'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <button onClick={clearMusaffaSession} style={{
              padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
              background: 'var(--bg-accent)', color: 'var(--text-secondary)', fontSize: '0.65rem',
              fontWeight: '700', cursor: 'pointer',
            }}>Dismiss</button>
            <button onClick={resumeMusaffaSession} style={{
              padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-gold)',
              background: 'var(--accent-gold)', color: '#000', fontSize: '0.65rem',
              fontWeight: '800', cursor: 'pointer',
            }}>Resume</button>
          </div>
        </div>
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
