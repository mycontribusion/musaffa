import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import SurahList from './components/SurahList';
import SurahDetail from './components/SurahDetail';
import PartnerSession from './components/PartnerSession';
import MutashabihatSession from './components/MutashabihatSession';
import MutashabihSelection from './components/MutashabihSelection';
import WeaknessTracker from './components/WeaknessTracker';
import { useQuranData } from './hooks/useQuranData';
import { useMusaffa } from './hooks/useMusaffa';
import { useQuiz } from './hooks/useQuiz';
import { useAudioDownload } from './hooks/useAudioDownload';

const App = () => {
  const [view, setView] = useState('list');
  const [theme, setTheme] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [partnerSubView, setPartnerSubView] = useState('config');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [musaffaParams, setMusaffaParams] = useState({ startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 286, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false });
  const [multiSurahSession, setMultiSurahSession] = useState(null);
  const [reciter, setReciter] = useState(() => localStorage.getItem('quran_reciter') || 'ar.saoodshuraym');
  const [stumbles, setStumbles] = useState(() => JSON.parse(localStorage.getItem('quran_stumbles') || '[]'));
  const [recentSurahs, setRecentSurahs] = useState(() => JSON.parse(localStorage.getItem('quran_recent') || '[]'));
  // Feature 3: Last-read ayah persistence for Quran reader
  const [lastRead, setLastRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_last_read') || 'null'); } catch { return null; }
  });
  // Feature 2: Musaffa session persistence
  const [savedMusaffaSession, setSavedMusaffaSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_session') || 'null'); } catch { return null; }
  });

  const DEFAULT_PRESETS = [
    { label: 'Juz Amma', startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false },
    { label: 'Al-Baqarah', startSurah: 2, startAyah: 1, endSurah: 2, endAyah: 286, portion: 'half', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: true },
    { label: 'Al-Kahf', startSurah: 18, startAyah: 1, endSurah: 18, endAyah: 110, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false },
  ];
  const [musaffaPresets, setMusaffaPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_presets') || 'null') || DEFAULT_PRESETS; } catch { return DEFAULT_PRESETS; }
  });
  const [presetEditingIndex, setPresetEditingIndex] = useState(null);

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
      } else if (parts[0] === 'mutashabihat') {
        if (parts[1] === 'custom') v = 'mutashabihat-selection';
        else if (parts[1] === 'session') v = 'mutashabihat-multi-session';
      } else if (parts[0] === 'weaknesses') {
        v = 'weaknesses';
      }
    } else if (!p.get('view')) {
      v = 'list';
    }

    if (s) setSelectedSurah(s);
    if (v) setView(v);
    if (pv) setPartnerSubView(pv);
  };

  const { surahs, quranAr, quranEn, mutashabihatData, waqarData, quranSimple, loading, error } = useQuranData(syncStateWithURL);
   const { chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, isPaused, audioError, setAudioError, startMusaffa, handleNextTurnManual, pauseMusaffa, resumeMusaffa, stopMusaffa } = useMusaffa(quranAr, musaffaParams, setPartnerSubView, reciter);
  const { dynamicMutashabihat, setDynamicMutashabihat, currentQuizIndex, setCurrentQuizIndex, quizScore, setQuizScore, quizFeedback, setQuizFeedback, generateDynamicQuiz, handleQuizAnswer } = useQuiz(mutashabihatData, quranAr, surahs, selectedSurah);
  const audioDownloadControls = useAudioDownload(quranAr, reciter);

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
    if (loading || error) return; // Wait until initial data is loaded

    let newPath = '/';
    if (view === 'detail' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}`;
    } else if (view === 'partner') {
      newPath = selectedSurah ? `/surah/${selectedSurah.number}/partner/${partnerSubView}` : `/partner/${partnerSubView}`;
    } else if (view === 'mutashabihat-session' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}/mutashabihat`;
    } else if (view === 'mutashabihat-selection') {
      newPath = `/mutashabihat/custom`;
    } else if (view === 'mutashabihat-multi-session') {
      newPath = `/mutashabihat/session`;
    } else if (view === 'weaknesses') {
      newPath = `/weaknesses`;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      if (window.location.search || currentPath === '/') {
        window.history.replaceState({}, '', newPath);
      } else {
        window.history.pushState({}, '', newPath);
      }
    }
  }, [view, selectedSurah, partnerSubView, loading, error]);

  // Global Scroll Reset: Prevent scroll bleeding between different pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, partnerSubView]);

  useEffect(() => { localStorage.setItem('quran_stumbles', JSON.stringify(stumbles)); }, [stumbles]);
  useEffect(() => { localStorage.setItem('quran_recent', JSON.stringify(recentSurahs)); }, [recentSurahs]);
  useEffect(() => { localStorage.setItem('quran_reciter', reciter); }, [reciter]);
  useEffect(() => { localStorage.setItem('quran_musaffa_presets', JSON.stringify(musaffaPresets)); }, [musaffaPresets]);
  // Feature 3: Persist last-read ayah
  useEffect(() => {
    if (lastRead) localStorage.setItem('quran_last_read', JSON.stringify(lastRead));
  }, [lastRead]);
    // Feature 2: Save/clear Musaffa session for pause & resume
    const saveMusaffaSession = useCallback(() => {
      const surahNum = selectedSurah?.number || musaffaParams.startSurah;
      if (!surahNum) return;
      setSavedMusaffaSession({
        params: musaffaParams,
        chunkIndex: chunks.length > 0 ? currentChunkIndex : 0,
        turn: mudarasaTurn,
        surahNumber: surahNum,
        savedAt: new Date().toISOString(),
      });
    }, [selectedSurah, musaffaParams, chunks.length, currentChunkIndex, mudarasaTurn]);

    const clearMusaffaSession = useCallback(() => {
      localStorage.removeItem('quran_musaffa_session');
      setSavedMusaffaSession(null);
    }, []);

    // Feature 2: Persist Musaffa session state
    useEffect(() => {
      if (savedMusaffaSession) localStorage.setItem('quran_musaffa_session', JSON.stringify(savedMusaffaSession));
    }, [savedMusaffaSession]);
    
     // Auto-save Musaffa session on every chunk/turn change during an active session
     useEffect(() => {
       if (partnerSubView !== 'mudarasa' || chunks.length === 0) return;
       setTimeout(() => {
         saveMusaffaSession();
       }, 0);
     }, [partnerSubView, chunks.length, saveMusaffaSession]);

     // Stop audio when leaving the mudarasa page, but KEEP the saved session so the resume banner shows
     const prevPartnerSubViewRef = useRef(partnerSubView);
     const prevViewRef = useRef(view);
     useEffect(() => {
       // Detect when leaving mudarasa page (either by changing subView or changing view)
       const wasInMudarasa = prevPartnerSubViewRef.current === 'mudarasa' && prevViewRef.current === 'partner';
       const isInMudarasa = partnerSubView === 'mudarasa' && view === 'partner';
       
       if (wasInMudarasa && !isInMudarasa) {
         // Stop audio but PRESERVE the session for resume
         stopMusaffa();
       }
       
       prevPartnerSubViewRef.current = partnerSubView;
       prevViewRef.current = view;
     }, [view, partnerSubView, stopMusaffa]);

   const handleSelectSurah = (s) => {
     setSelectedSurah(s);
     setRecentSurahs(p => {
       const updated = [s, ...p.filter(x => x.number !== s.number)].slice(0, 5);
       return updated;
     });
     setMusaffaParams(p => ({ ...p, startSurah: s.number, startAyah: 1, endSurah: s.number, endAyah: s.numberOfAyahs }));
   };

   // Auto-update endSurah/endAyah when startSurah changes in Musaffa config
   const handleMusaffaParamChange = (key, value) => {
     if (key === 'startSurah') {
       const surah = surahs.find(x => x.number === value);
       if (surah) {
         setMusaffaParams(p => ({ ...p, startSurah: value, startAyah: 1, endSurah: value, endAyah: surah.numberOfAyahs }));
         return;
       }
     }
     setMusaffaParams(p => ({ ...p, [key]: value }));
   };

    // Feature 2: Resume Musaffa session from saved state
      const resumeMusaffaSession = useCallback(() => {
        if (!savedMusaffaSession) return;
        // Capture saved data in a local var so the setTimeout closure can't go stale
        const saved = { ...savedMusaffaSession };
        // Set selectedSurah to the saved surah for correct context
        const savedSurah = surahs.find(s => s.number === saved.surahNumber);
        if (savedSurah) {
          setSelectedSurah(savedSurah);
        }
        // Update params to saved values
        setMusaffaParams(saved.params);
        setView('partner');
        // Don't set subView to mudarasa yet — startMusaffa will do that
        // Pass saved params directly so it creates chunks from the correct surah/range
        startMusaffa(null, saved.chunkIndex || 0, saved.turn || 'app', saved.params);
      }, [savedMusaffaSession, startMusaffa, setView, surahs]);

     // Restore session on page load if URL is /partner/mudarasa
     useEffect(() => {
       if (savedMusaffaSession && window.location.pathname.startsWith('/partner/mudarasa')) {
         setTimeout(() => {
           resumeMusaffaSession();
         }, 0);
       }
     }, [savedMusaffaSession, resumeMusaffaSession]);

  // Launch Musaffa directly from a preset (bypasses config screen)
  const startMusaffaFromPreset = useCallback((preset) => {
    setMusaffaParams(preset);
    setTimeout(() => {
      startMusaffa(null, 0, preset.whoStarts === 'user' ? 'user' : 'app', preset);
    }, 0);
    setView('partner');
  }, [startMusaffa, setView]);

  // Open config page in preset-edit mode
  const editPreset = useCallback((index) => {
    setPresetEditingIndex(index);
    setMusaffaParams(musaffaPresets[index]);
    setView('partner');
    setPartnerSubView('config');
  }, [musaffaPresets, setView]);

  // Save edited preset and return home
  const handleSavePreset = useCallback((updatedParams) => {
    setMusaffaPresets(prev => {
      const next = [...prev];
      next[presetEditingIndex] = updatedParams;
      return next;
    });
    setPresetEditingIndex(null);
    setView('list');
  }, [presetEditingIndex, setView]);

  const startQuiz = (type, customSurahs = []) => {
    setActiveQuizType(type);
    setQuizFeedback(null);
    const q = generateDynamicQuiz(type, customSurahs);
    if (q.length) { setDynamicMutashabihat(q); setCurrentQuizIndex(0); setQuizScore(0); setPartnerSubView('quiz'); setView('partner'); }
    else alert(`No mutashabihat found for this selection.`);
  };

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev;
      return [...prev, { ...ayah, date: new Date().toISOString(), surahName: selectedSurah?.englishName || 'Unknown' }];
    });
  };

  if (loading) return <div className="loading-screen"><div className="loader" /></div>;

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>📶</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>You're Offline</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-gold)', color: '#000', borderRadius: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        theme={theme} 
        setTheme={setTheme} 
        view={view} 
        setView={setView} 
        setPartnerSubView={setPartnerSubView}
        isInMusaffaSession={view === 'partner' && partnerSubView === 'mudarasa'}
        isPaused={isPaused}
        onPauseMusaffa={pauseMusaffa}
        onResumeMusaffa={resumeMusaffa}
        reciter={reciter}
        setReciter={setReciter}
      />
      <div className="app-container">
        <main className="pb-24">
          <AnimatePresence mode="wait">
            {view === 'list' && <SurahList surahs={surahs} recentSurahs={recentSurahs} handleSelectSurah={handleSelectSurah} setView={setView} audioDownloadControls={audioDownloadControls} savedMusaffaSession={savedMusaffaSession} resumeMusaffaSession={resumeMusaffaSession} clearMusaffaSession={clearMusaffaSession} startQuiz={startQuiz} setPartnerSubView={setPartnerSubView} setMusaffaParams={setMusaffaParams} musaffaPresets={musaffaPresets} setMusaffaPresets={setMusaffaPresets} startMusaffaFromPreset={startMusaffaFromPreset} editPreset={editPreset} />}
            {view === 'weaknesses' && <WeaknessTracker stumbles={stumbles} setStumbles={setStumbles} surahs={surahs} setView={setView} setPartnerSubView={setPartnerSubView} setMusaffaParams={setMusaffaParams} handleSelectSurah={handleSelectSurah} />}
            {view === 'mutashabihat-selection' && <MutashabihSelection surahs={surahs} waqarData={waqarData} quranAr={quranAr} setView={setView} setMultiSurahSession={setMultiSurahSession} />}
            {view === 'mutashabihat-multi-session' && multiSurahSession && (
              <MutashabihatSession
                key="multi-session"
                multiSurahData={multiSurahSession}
                quranAr={quranAr}
                surahs={surahs}
                onClose={() => setView('mutashabihat-selection')}
              />
            )}
            {view === 'detail' && selectedSurah && <SurahDetail selectedSurah={selectedSurah} surahs={surahs} handleSelectSurah={handleSelectSurah} quranAr={quranAr} quranEn={quranEn} setView={setView} openMusaffaConfig={(s) => { handleSelectSurah(s); setPartnerSubView('config'); setView('partner'); }} startQuiz={startQuiz} waqarData={waqarData} lastRead={lastRead} setLastRead={setLastRead} reciter={reciter} audioDownloadControls={audioDownloadControls} />}
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
                  reciter={reciter}
                  setReciter={setReciter}
                  activeQuizType={activeQuizType}
                  handleMusaffaParamChange={handleMusaffaParamChange}
                  savedMusaffaSession={savedMusaffaSession}
                  saveMusaffaSession={saveMusaffaSession}
                  clearMusaffaSession={clearMusaffaSession}
                  resumeMusaffaSession={resumeMusaffaSession}
                  pauseMusaffa={pauseMusaffa}
                  resumeMusaffa={resumeMusaffa}
                  stopMusaffa={stopMusaffa}
                  isPaused={isPaused}
                  audioError={audioError}
                  setAudioError={setAudioError}
                  audioDownloadControls={audioDownloadControls}
                  enableErrorDetection={musaffaParams.errorDetection}
                  quranSimple={quranSimple}
                  presetEditingIndex={presetEditingIndex}
                  onSavePreset={handleSavePreset}
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
    </>
  );
};

export default App;
