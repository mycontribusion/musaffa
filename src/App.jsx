import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import SurahList from './components/SurahList';
import SurahDetail from './components/SurahDetail';
import PartnerSession from './components/PartnerSession';
import MutashabihatSession from './components/MutashabihatSession';
import { useQuranData } from './hooks/useQuranData';
import { useMusaffa } from './hooks/useMusaffa';
import { useQuiz } from './hooks/useQuiz';

const App = () => {
  const [view, setView] = useState('list');
  const [theme, setTheme] = useState('dark');
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [partnerSubView, setPartnerSubView] = useState('config');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [musaffaParams, setMusaffaParams] = useState({ startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 7, portion: 'page', whoStarts: 'app', autoNext: false, micSensitivity: 40 });
  const [stumbles, setStumbles] = useState(() => JSON.parse(localStorage.getItem('quran_stumbles') || '[]'));
  const [recentSurahs, setRecentSurahs] = useState(() => JSON.parse(localStorage.getItem('quran_recent') || '[]'));

  const syncStateWithURL = (sList) => {
    const p = new URLSearchParams(window.location.search);
    const s = sList.find(x => x.number === Number(p.get('surah')));
    if (s) setSelectedSurah(s);
    if (p.get('view')) setView(p.get('view'));
    if (p.get('partnerView')) setPartnerSubView(p.get('partnerView'));
  };

  const { surahs, quranAr, quranEn, mutashabihatData, waqarData, loading } = useQuranData(syncStateWithURL);
  const { chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, startMusaffa, handleNextTurnManual } = useMusaffa(quranAr, musaffaParams, setPartnerSubView);
  const { dynamicMutashabihat, setDynamicMutashabihat, currentQuizIndex, setCurrentQuizIndex, quizScore, setQuizScore, quizFeedback, setQuizFeedback, generateDynamicQuiz, handleQuizAnswer } = useQuiz(mutashabihatData, quranAr, surahs, selectedSurah);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => {
    const p = new URLSearchParams(); if (selectedSurah) p.set('surah', selectedSurah.number); p.set('view', view); if (view === 'partner') p.set('partnerView', partnerSubView);
    window.history.replaceState({}, '', `${window.location.pathname}?${p.toString()}`);
  }, [view, selectedSurah, partnerSubView]);

  useEffect(() => { localStorage.setItem('quran_stumbles', JSON.stringify(stumbles)); }, [stumbles]);
  useEffect(() => { localStorage.setItem('quran_recent', JSON.stringify(recentSurahs)); }, [recentSurahs]);

  const handleSelectSurah = (s) => {
    setSelectedSurah(s);
    setRecentSurahs(p => {
      const updated = [s, ...p.filter(x => x.number !== s.number)].slice(0, 5);
      return updated;
    });
    setMusaffaParams(p => ({ ...p, startSurah: s.number, startAyah: 1, endSurah: s.number, endAyah: s.numberOfAyahs }));
  };

  const startQuiz = (type) => {
    setActiveQuizType(type);
    const q = generateDynamicQuiz(type);
    if (q.length) { setDynamicMutashabihat(q); setCurrentQuizIndex(0); setQuizScore(0); setPartnerSubView('quiz'); setView('partner'); }
    else alert(`No mutashabihat found for this Surah.`);
  };

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev;
      return [...prev, { ...ayah, date: new Date().toISOString(), surahName: selectedSurah?.englishName || 'Unknown' }];
    });
  };

  if (loading) return <div className="loading-screen"><div className="loader" /></div>;

  return (
    <div className="app-container">
      <Header theme={theme} setTheme={setTheme} view={view} setView={setView} setPartnerSubView={setPartnerSubView} />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {view === 'list' && <SurahList surahs={surahs} recentSurahs={recentSurahs} handleSelectSurah={handleSelectSurah} setView={setView} />}
          {view === 'detail' && selectedSurah && <SurahDetail selectedSurah={selectedSurah} surahs={surahs} handleSelectSurah={handleSelectSurah} quranAr={quranAr} quranEn={quranEn} setView={setView} openMusaffaConfig={(s) => { handleSelectSurah(s); setPartnerSubView('config'); setView('partner'); }} startQuiz={startQuiz} waqarData={waqarData} />}
          {view === 'partner' && (
            <PartnerSession 
              key="partner-view"
              subView={partnerSubView} 
              setSubView={setPartnerSubView} 
              params={musaffaParams} 
              setParams={setMusaffaParams} 
              surahs={surahs} 
              startMusaffa={startMusaffa} 
              startQuiz={startQuiz} 
              chunks={chunks} 
              currentChunkIndex={currentChunkIndex} 
              currentAyahNumber={currentAyahNumber} 
              turn={mudarasaTurn} 
              handleNextTurn={handleNextTurnManual} 
              logStumble={logStumble} 
              setView={setView} 
              questions={dynamicMutashabihat}
              quizScore={quizScore}
              quizFeedback={quizFeedback}
              handleQuizAnswer={(a) => handleQuizAnswer(a, () => setPartnerSubView('quiz-result'))}
              currentQuizIndex={currentQuizIndex}
              activeQuizType={activeQuizType}
            />
          )}
          {view === 'mutashabihat-session' && selectedSurah && waqarData && waqarData[selectedSurah.number] && (
            <MutashabihatSession 
              key={`waqar-${selectedSurah.number}`}
              surah={selectedSurah} 
              allSurahEntries={waqarData[selectedSurah.number]} 
              quranAr={quranAr} 
              surahs={surahs}
              onClose={() => setView('detail')} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
