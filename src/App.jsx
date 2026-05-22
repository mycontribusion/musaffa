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
  const [theme, setTheme] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [partnerSubView, setPartnerSubView] = useState('config');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [musaffaParams, setMusaffaParams] = useState({ startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 7, portion: 'page', whoStarts: 'app', autoNext: false, micSensitivity: 40 });
  const [stumbles, setStumbles] = useState(() => JSON.parse(localStorage.getItem('quran_stumbles') || '[]'));
  const [recentSurahs, setRecentSurahs] = useState(() => JSON.parse(localStorage.getItem('quran_recent') || '[]'));

  const syncStateWithURL = (sList) => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const p = new URLSearchParams(window.location.search);
    
    // Support legacy query params and new path structure
    let s = sList.find(x => x.number === Number(p.get('surah')));
    let v = p.get('view') || 'list';
    let pv = p.get('partnerView') || 'config';

    if (parts.length > 0) {
      if (parts[0] === 'surah' && parts[1]) {
        s = sList.find(x => x.number === Number(parts[1]));
        v = 'detail';
        if (parts[2] === 'partner' && parts[3]) {
          v = 'partner';
          pv = parts[3];
        } else if (parts[2] === 'mutashabihat') {
          v = 'mutashabihat-session';
        }
      } else if (parts[0] === 'partner' && parts[1]) {
        v = 'partner';
        pv = parts[1];
      }
    } else if (!p.get('view')) {
      v = 'list';
    }

    if (s) setSelectedSurah(s);
    if (v) setView(v);
    if (pv) setPartnerSubView(pv);
  };

  const { surahs, quranAr, quranEn, mutashabihatData, waqarData, loading } = useQuranData(syncStateWithURL);
  const { chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, startMusaffa, handleNextTurnManual } = useMusaffa(quranAr, musaffaParams, setPartnerSubView);
  const { dynamicMutashabihat, setDynamicMutashabihat, currentQuizIndex, setCurrentQuizIndex, quizScore, setQuizScore, quizFeedback, setQuizFeedback, generateDynamicQuiz, handleQuizAnswer } = useQuiz(mutashabihatData, quranAr, surahs, selectedSurah);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  
  // Handle browser back/forward buttons
  useEffect(() => {
    if (!surahs || surahs.length === 0) return;
    const handlePopState = () => syncStateWithURL(surahs);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surahs]);

  // Sync state to URL paths
  useEffect(() => {
    if (loading) return; // Wait until initial data is loaded

    let newPath = '/';
    if (view === 'detail' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}`;
    } else if (view === 'partner') {
      newPath = selectedSurah ? `/surah/${selectedSurah.number}/partner/${partnerSubView}` : `/partner/${partnerSubView}`;
    } else if (view === 'mutashabihat-session' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}/mutashabihat`;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      if (window.location.search || currentPath === '/') {
        window.history.replaceState({}, '', newPath);
      } else {
        window.history.pushState({}, '', newPath);
      }
    }
  }, [view, selectedSurah, partnerSubView, loading]);

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
