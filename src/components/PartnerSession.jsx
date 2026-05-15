import React, { useRef, useEffect } from 'react';
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
  activeQuizType
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
    params.autoNext && (subView === 'mudarasa' || subView === 'config'),
    params.micSensitivity,
    subView === 'mudarasa' && turn === 'user' ? handleNextTurn : null
  );

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Dispatcher
  if (subView === 'config') return (
    <PartnerConfig 
      key="config"
      surahs={surahs} 
      params={params} 
      onChange={handleParamChange} 
      onStart={startMusaffa} 
      onBack={() => setView('list')}
      currentVolume={currentVolume}
      isListening={isListening}
    />
  );

  if (subView === 'mudarasa' && chunks[currentChunkIndex]) return (
    <MudarasaView 
      key="mudarasa"
      chunks={chunks} 
      currentChunkIndex={currentChunkIndex} 
      currentAyahNumber={currentAyahNumber} 
      mudarasaTurn={turn} 
      onNext={handleNextTurn} 
      onBack={() => setSubView('config')} 
      onLogStumble={logStumble}
      isListening={isListening}
      currentVolume={currentVolume}
      sensitivity={params.micSensitivity}
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
