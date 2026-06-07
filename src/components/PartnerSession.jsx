import { useEffect, useCallback, useRef } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { useMic } from '../hooks/useMic';
import { useRecitationCheck } from '../hooks/useRecitationCheck';
import { removeTashkeel } from '../utils/quranUtils';

/**
 * Build expected text for the current chunk by concatenating ayah texts,
 * stripping Basmala from the start of Surahs (same logic as MudarasaView display).
 */
const buildExpectedText = (chunk) => {
  if (!chunk || chunk.length === 0) return '';
  return chunk.map(ayah => {
    let text = ayah.text || '';
    if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
      const clean = text.replace(/\uFEFF/g, '');
      const bismillahEnd = 'ٱلرَّحِيمِ';
      const idx = clean.indexOf(bismillahEnd);
      if (idx !== -1 && idx < 50) {
        text = clean.substring(idx + bismillahEnd.length).trim();
      }
    }
    return removeTashkeel(text);
  }).join(' ');
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

  // Build expected text for the current chunk
  const currentChunk = chunks[currentChunkIndex] || null;
  const expectedText = currentChunk ? buildExpectedText(currentChunk) : '';

  // Declare handleFinishedTurn BEFORE useRecitationCheck so it can be passed as onAutoFinish.
  // We use a ref to avoid stale closure issues with the initial callback registration.
  const handleFinishedTurnRef = useRef(null);

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
  } = useRecitationCheck(
    sttActive,
    expectedText,
    useCallback(() => { handleFinishedTurnRef.current?.(); }, []),
  );

  // When the user taps "Tap to finish early" or auto-silence triggers:
  // stop STT → comparison runs async → feedback card appears
  // Turn only advances when user clicks "Continue" (handleContinueAfterFeedback)
  const handleFinishedTurn = useCallback(() => {
    if (enableErrorDetection && sttSupported) {
      stopAndCheck();
    } else {
      handleNextTurn();
    }
  }, [enableErrorDetection, sttSupported, stopAndCheck, handleNextTurn]);

  // Keep the ref in sync so the onAutoFinish closure always calls the latest version
  handleFinishedTurnRef.current = handleFinishedTurn;

  // When feedback card "Continue" is clicked, clear and advance turn
  const handleContinueAfterFeedback = useCallback(() => {
    clearResults();
    handleNextTurn();
  }, [clearResults, handleNextTurn]);

  // Dispatcher
  if (subView === 'config') return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.5rem 0.5rem 6rem' }}>
      {/* Resume Session Banner */}
      {savedMusaffaSession && (
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
      recitationResults={recitationResults}
      transcript={transcript}
      onFinishedTurn={handleFinishedTurn}
      onClearResults={handleContinueAfterFeedback}
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
