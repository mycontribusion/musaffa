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
  const activeAyahRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    if (activeAyahRef.current && turn === 'app') {
      activeAyahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentAyahNumber, turn]);

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
      activeAyahRef={activeAyahRef}
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
