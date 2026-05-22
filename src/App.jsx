import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import SurahList from './components/SurahList';
import SurahDetail from './components/SurahDetail';
import PartnerConfig from './components/PartnerConfig';
import MudarasaView from './components/MudarasaView';
import QuizEngine from './components/QuizEngine';
import MutashabihatSession from './components/MutashabihatSession';
import { useQuranData } from './hooks/useQuranData';
import { useMusaffa } from './hooks/useMusaffa';
import { useQuiz } from './hooks/useQuiz';

// Wrapper reads surahNumber from URL params for MutashabihatSession
const MutashabihatRoute = ({ surahs, waqarData, quranAr }) => {
  const { surahNumber } = useParams();
  const navigate = useNavigate();
  const surah = surahs.find(s => s.number === Number(surahNumber));
  if (!surah || !waqarData || !waqarData[surah.number]) return <Navigate to="/" />;
  return (
    <MutashabihatSession
      key={`waqar-${surah.number}`}
      surah={surah}
      allSurahEntries={waqarData[surah.number]}
      quranAr={quranAr}
      surahs={surahs}
      onClose={() => navigate(`/surah/${surahNumber}`)}
    />
  );
};

const App = () => {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [musaffaParams, setMusaffaParams] = useState({
    startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 7,
    portion: 'page', whoStarts: 'app', autoNext: false, micSensitivity: 40
  });
  const [stumbles, setStumbles] = useState(() => JSON.parse(localStorage.getItem('quran_stumbles') || '[]'));
  const [recentSurahs, setRecentSurahs] = useState(() => JSON.parse(localStorage.getItem('quran_recent') || '[]'));
  const [activeQuizType, setActiveQuizType] = useState('all');

  const { surahs, quranAr, quranEn, mutashabihatData, waqarData, loading } = useQuranData();
  const { chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, startMusaffa, handleNextTurnManual } =
    useMusaffa(quranAr, musaffaParams, navigate);
  const {
    dynamicMutashabihat, setDynamicMutashabihat,
    currentQuizIndex, setCurrentQuizIndex,
    quizScore, setQuizScore,
    quizFeedback, setQuizFeedback,
    generateDynamicQuiz, handleQuizAnswer
  } = useQuiz(mutashabihatData, quranAr, surahs, selectedSurah);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('quran_stumbles', JSON.stringify(stumbles)); }, [stumbles]);
  useEffect(() => { localStorage.setItem('quran_recent', JSON.stringify(recentSurahs)); }, [recentSurahs]);

  const handleSelectSurah = (s) => {
    setSelectedSurah(s);
    setRecentSurahs(prev => [s, ...prev.filter(x => x.number !== s.number)].slice(0, 5));
    setMusaffaParams(p => ({ ...p, startSurah: s.number, startAyah: 1, endSurah: s.number, endAyah: s.numberOfAyahs }));
  };

  const startQuiz = (type) => {
    setActiveQuizType(type);
    const q = generateDynamicQuiz(type);
    if (q.length) {
      setDynamicMutashabihat(q);
      setCurrentQuizIndex(0);
      setQuizScore(0);
      navigate('/partner/quiz');
    } else {
      alert('No mutashabihat found for this Surah.');
    }
  };

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev;
      return [...prev, { ...ayah, date: new Date().toISOString(), surahName: selectedSurah?.englishName || 'Unknown' }];
    });
  };

  if (loading) return <div className="loading-screen"><div className="loader" /></div>;

  const handleParamChange = (key, value) => setMusaffaParams(p => ({ ...p, [key]: value }));

  return (
    <div className="app-container">
      <Header theme={theme} setTheme={setTheme} />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <SurahList
                surahs={surahs}
                recentSurahs={recentSurahs}
                handleSelectSurah={handleSelectSurah}
              />
            } />

            <Route path="/surah/:surahNumber" element={
              <SurahDetail
                surahs={surahs}
                handleSelectSurah={handleSelectSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                waqarData={waqarData}
                startQuiz={startQuiz}
              />
            } />

            <Route path="/surah/:surahNumber/mutashabihat" element={
              <MutashabihatRoute surahs={surahs} waqarData={waqarData} quranAr={quranAr} />
            } />

            <Route path="/partner" element={
              <PartnerConfig
                surahs={surahs}
                params={musaffaParams}
                onChange={handleParamChange}
                onStart={startMusaffa}
              />
            } />

            <Route path="/partner/session" element={
              chunks.length > 0
                ? <MudarasaView
                    chunks={chunks}
                    currentChunkIndex={currentChunkIndex}
                    currentAyahNumber={currentAyahNumber}
                    mudarasaTurn={mudarasaTurn}
                    onNext={handleNextTurnManual}
                    onLogStumble={logStumble}
                    autoNext={musaffaParams.autoNext}
                    micSensitivity={musaffaParams.micSensitivity}
                  />
                : <Navigate to="/partner" />
            } />

            <Route path="/partner/quiz" element={
              <QuizEngine
                subView="quiz"
                questions={dynamicMutashabihat}
                currentQuizIndex={currentQuizIndex}
                quizScore={quizScore}
                quizFeedback={quizFeedback}
                handleQuizAnswer={(a) => handleQuizAnswer(a, () => navigate('/partner/quiz/result'))}
                startQuiz={startQuiz}
                selectedSurah={selectedSurah}
                activeQuizType={activeQuizType}
              />
            } />

            <Route path="/partner/quiz/result" element={
              <QuizEngine
                subView="quiz-result"
                questions={dynamicMutashabihat}
                currentQuizIndex={currentQuizIndex}
                quizScore={quizScore}
                quizFeedback={quizFeedback}
                handleQuizAnswer={(a) => handleQuizAnswer(a, () => navigate('/partner/quiz/result'))}
                startQuiz={startQuiz}
                selectedSurah={selectedSurah}
                activeQuizType={activeQuizType}
              />
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
