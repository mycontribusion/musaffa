import { useEffect } from 'react';
import PartnerConfig from './PartnerConfig';
import MudarasaView from './MudarasaView';
import QuizEngine from './QuizEngine';
import { useMic } from '../hooks/useMic';

const PartnerSession = ({
  subView,
  surahs,
  params,
  setParams,
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

  // Mic logic for Hands-Free
  const { currentVolume, isListening } = useMic(
    params.autoNext && (subView === 'config' || (subView === 'mudarasa' && turn === 'user')),
    params.micSensitivity,
    subView === 'mudarasa' && turn === 'user' ? handleNextTurn : null
  );

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
      onBack={() => { stopMusaffa(); clearMusaffaSession(); setSubView('config'); }}
      onLogStumble={logStumble}
      isListening={isListening}
      currentVolume={currentVolume}
      sensitivity={params.micSensitivity}
      isPaused={isPaused}
      onPause={pauseMusaffa}
      onResume={resumeMusaffa}
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
