import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import HomeControls from './components/HomeControls';
import AudioManager from './components/AudioManager';
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
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { useMusaffaSession } from './hooks/useMusaffaSession';
import { usePresets } from './hooks/usePresets';
import { useVoskModelDownload } from './hooks/useVoskModelDownload';

/**
 * Views that ship their own top-level header inside the normal page flow.
 *
 * The global `<Header />` is not rendered for these, so the local bar is the
 * only header on screen and starts at the top of the viewport:
 *
 *  - `weaknesses`             — Mistake Book     (`WeaknessTracker`)
 *  - `audio-manager`          — Audio Manager    (`AudioManager`)
 *  - `detail`                 — Surah Detail     (`SurahDetail`)
 *  - `mutashabihat-selection` — Mutashabih Quiz (`MutashabihSelection`)
 *  - `mutashabihat-multi-session` — Mutashabih Quiz session (`MutashabihatSession`)
 *
 * Every other view keeps the global header exactly as it is today. The local
 * headers of those views no longer need to offset themselves past the global
 * header, so they pin to `top: 0` instead.
 */
const VIEWS_WITHOUT_GLOBAL_HEADER = new Set([
  'weaknesses',
  'audio-manager',
  'detail',
  'mutashabihat-selection',
  'mutashabihat-multi-session',
]);

/**
 * Placeholder for views whose data is still resolving.
 *
 * Without it those views rendered *nothing*, which on a direct-URL refresh is
 * the entire first paint — the user saw a blank page rather than a spinner.
 */
const InlineLoader = ({ minHeight = '60vh' }) => (
  <div className="loading-screen" style={{ minHeight }}>
    <div className="loader" />
  </div>
);

const App = () => {
  const [view, setView] = useState('list');
  const [theme, setTheme] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [partnerSubView, setPartnerSubView] = useState('config');
  const [activeQuizType, setActiveQuizType] = useState('all');
  /* Persisted, not in-memory: this is the only backing state for the
     `/mutashabihat/session` route. Held in a plain useState it was always
     null after a reload, so a refresh on that URL rendered an empty tree
     (no header either) and the URL-sync effect pinned the user to the blank
     page. The payload is a small [{ surahNum, entries }] slice of waqar114,
     so persisting is cheap. */
  const [multiSurahSession, setMultiSurahSession] = useLocalStorageState('quran_multi_surah_session', null);
  const [targetAyah, setTargetAyah] = useState(null);

  const DEFAULT_PARAMS = { startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 286, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false, errorThreshold: 50 };
  
  const [musaffaParams, setMusaffaParams] = useLocalStorageState('quran_musaffa_params', DEFAULT_PARAMS);
  const [reciter, setReciter] = useLocalStorageState('quran_reciter', 'ar.saoodshuraym', true);
  const [stumbles, setStumbles] = useLocalStorageState('quran_stumbles', []);
  const [recentSurahs, setRecentSurahs] = useLocalStorageState('quran_recent', []);
  const [lastRead, setLastRead] = useLocalStorageState('quran_last_read', null);

  const syncStateWithURL = useCallback((sList) => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const p = new URLSearchParams(window.location.search);

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
      } else if (parts[0] === 'audio-manager') {
        v = 'audio-manager';
      }
    } else if (!p.get('view')) {
      v = 'list';
    }

    if (s) setSelectedSurah(s);
    if (v) setView(v);
    if (pv) setPartnerSubView(pv);
  }, []);

  const { surahs, quranAr, quranEn, mutashabihatData, waqarData, quranSimple, loading, error, waqarPending } = useQuranData(syncStateWithURL);
  
  const { chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, isPaused, audioError, setAudioError, startMusaffa, handleNextTurnManual, pauseMusaffa, resumeMusaffa, stopMusaffa } = useMusaffa(quranAr, musaffaParams, setPartnerSubView, reciter);
  
  const { dynamicMutashabihat, setDynamicMutashabihat, currentQuizIndex, setCurrentQuizIndex, quizScore, setQuizScore, quizFeedback, setQuizFeedback, generateDynamicQuiz, handleQuizAnswer } = useQuiz(mutashabihatData, quranAr, surahs, selectedSurah);
  
  const audioDownloadControls = useAudioDownload(quranAr, reciter);

   const {
     modelStatus,
     installProgress,
     installMessage,
     showInstallPrompt,
     confirmInstall,
     downloadAndInitModel,
     setShowInstallPrompt,
     isNative,
   } = useVoskModelDownload();

  const { savedMusaffaSession, saveMusaffaSession, clearMusaffaSession, resumeMusaffaSession } = useMusaffaSession(
    selectedSurah, musaffaParams, chunks, currentChunkIndex, mudarasaTurn, partnerSubView, view, surahs, startMusaffa, stopMusaffa, setSelectedSurah, setMusaffaParams, setView
  );

  const { musaffaPresets, setMusaffaPresets, presetEditingIndex, exitPresetEditing, startMusaffaFromPreset, editPreset, createPreset, canDeletePreset, deletePreset, handleSavePreset } = usePresets(setMusaffaParams, startMusaffa, setView, setPartnerSubView);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!surahs || surahs.length === 0) return;
    const handlePopState = () => syncStateWithURL(surahs);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surahs, syncStateWithURL]);

  /**
   * Can the current `view` actually paint anything?
   *
   * A URL is only a pointer to in-memory state. On a reload that state is
   * gone, so some URLs resolve to a view whose render guard is false and the
   * page comes up empty — permanently, because the URL-sync effect below
   * would keep rewriting the same dead path. These are exactly the states
   * `canRenderView` refuses to accept.
   */
  const canRenderView = useCallback(() => {
    switch (view) {
      case 'detail':
        return !!selectedSurah;
      case 'mutashabihat-multi-session':
        return Array.isArray(multiSurahSession) && multiSurahSession.length > 0;
      case 'mutashabihat-session':
        // Still resolving the optional file: not dead, just not ready yet.
        if (waqarPending) return true;
        return !!selectedSurah && !!waqarData?.[selectedSurah.number]?.length;
      case 'partner':
        if (partnerSubView !== 'mudarasa') return true;
        // A live recitation needs `chunks`, which only exist once a session
        // has been started. On a deep-link refresh they are empty until the
        // saved session auto-resumes, so only give up when there is nothing
        // to resume.
        return chunks.length > 0 || !!savedMusaffaSession;
      default:
        return true;
    }
  }, [view, selectedSurah, multiSurahSession, waqarPending, waqarData, partnerSubView, chunks.length, savedMusaffaSession]);

  // Sync state to URL paths
  useEffect(() => {
    if (loading || error) return;

    if (!canRenderView()) {
      // Unpaintable route. Painting it would be a blank page, so stop
      // re-asserting the bad path and put the user somewhere useful.
      //
      // A dead Musaffa session drops to the config sub-view rather than the
      // home page: the user was mid-recitation, and config is where Start
      // lives, so that is the least jarring recovery. Everything else goes home.
      if (view === 'partner') {
        window.history.replaceState({}, '', selectedSurah ? `/surah/${selectedSurah.number}/partner/config` : '/partner/config');
        setPartnerSubView('config');
        return;
      }
      window.history.replaceState({}, '', '/');
      setView('list');
      setPartnerSubView('config');
      return;
    }

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
    } else if (view === 'audio-manager') {
      newPath = `/audio-manager`;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      if (window.location.search || currentPath === '/') {
        window.history.replaceState({}, '', newPath);
      } else {
        window.history.pushState({}, '', newPath);
      }
    }
  }, [view, selectedSurah, partnerSubView, loading, error, canRenderView]);

  // Global Scroll Reset: Prevent scroll bleeding between different pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, partnerSubView]);

  const handleSelectSurah = (s) => {
    setSelectedSurah(s);
    setRecentSurahs(p => {
      const updated = [s, ...p.filter(x => x.number !== s.number)].slice(0, 5);
      return updated;
    });
    // Clear any search-directed ayah jump; normal browsing resumes last-read behaviour.
    setTargetAyah(null);
    setMusaffaParams(p => ({ ...p, startSurah: s.number, startAyah: 1, endSurah: s.number, endAyah: s.numberOfAyahs }));
  };

  /**
   * Open a surah and scroll straight to a specific ayah.
   * Used by Quran search results. Reuses the existing detail view and the
   * existing `targetAyah` scroll mechanism in SurahDetail — no parallel
   * navigation system. A null targetAyah means "use last-read behaviour".
   */
  const handleOpenAyah = (surahNumber, ayahNumber) => {
    const s = surahs.find(x => x.number === surahNumber);
    if (!s) return;
    setSelectedSurah(s);
    setRecentSurahs(p => [s, ...p.filter(x => x.number !== s.number)].slice(0, 5));
    setTargetAyah(ayahNumber || null);
    setView('detail');
  };

  const handleMusaffaParamChange = (key, value) => {
    setMusaffaParams(p => {
      const next = { ...p, [key]: value };
      if (key === 'startSurah') {
        next.startAyah = 1;
        const startBeyondEnd = value > p.endSurah || (value === p.endSurah && 1 >= p.endAyah);
        if (startBeyondEnd) {
          const surah = surahs.find(x => x.number === value);
          next.endSurah = value;
          next.endAyah = surah ? surah.numberOfAyahs : p.endAyah;
        }
      }
      return next;
    });
  };

  const startQuiz = (type, customSurahs = []) => {
    setActiveQuizType(type);
    setQuizFeedback(null);
    const q = generateDynamicQuiz(type, customSurahs);
    if (q.length) { 
      setDynamicMutashabihat(q); 
      setCurrentQuizIndex(0); 
      setQuizScore(0); 
      setPartnerSubView('quiz'); 
      setView('partner'); 
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>📶</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>You're Offline</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--gold-gradient)', color: 'var(--text-on-gold)', borderRadius: '0.75rem', fontWeight: 'var(--fw-strong)', border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const modelReady = modelStatus === 'ready';

  /**
   * The Musaffa session replaces the global header instead of stacking under it.
   *
   * `MudarasaHeader` already carries the full set of session controls (back,
   * portion counter, Pause/Resume, Text toggle, STT status), so keeping the
   * global bar above it only pushed the recitation area down the viewport and
   * duplicated the back affordance.
   *
   * Scoped to `subView === 'mudarasa'` deliberately: the other `partner`
   * sub-views (`config`, `quiz`, `quiz-result`) have no local header at all and
   * must keep the global one, otherwise they would render with no header.
   */
  const isMusaffaSession = view === 'partner' && partnerSubView === 'mudarasa';

  const showGlobalHeader = !VIEWS_WITHOUT_GLOBAL_HEADER.has(view) && !isMusaffaSession;

  return (
    <>
      {showGlobalHeader && (
        <Header
          theme={theme}
          setTheme={setTheme}
          setView={setView}
          // Vosk model install props
          modelStatus={modelStatus}
          installProgress={installProgress}
          installMessage={installMessage}
          showInstallPrompt={showInstallPrompt}
          confirmInstall={confirmInstall}
          setShowInstallPrompt={setShowInstallPrompt}
          isNative={isNative}
        />
      )}
      <div className="app-container">
        <main className="pb-24">
          {/* Homepage controls sit directly below the global header. */}
          {view === 'list' && (
            <HomeControls setView={setView} />
          )}

          <AnimatePresence mode="wait">
            {view === 'list' && (
              <SurahList
                surahs={surahs}
                quranAr={quranAr}
                quranEn={quranEn}
                recentSurahs={recentSurahs}
                handleSelectSurah={handleSelectSurah}
                openAyah={handleOpenAyah}
                setView={setView} 
                audioDownloadControls={audioDownloadControls} 
                savedMusaffaSession={savedMusaffaSession} 
                resumeMusaffaSession={resumeMusaffaSession} 
                clearMusaffaSession={clearMusaffaSession} 
                startQuiz={startQuiz} 
                setPartnerSubView={setPartnerSubView} 
                setMusaffaParams={setMusaffaParams} 
                musaffaPresets={musaffaPresets} 
                setMusaffaPresets={setMusaffaPresets}
                startMusaffaFromPreset={startMusaffaFromPreset}
                editPreset={editPreset}
                createPreset={createPreset}
                exitPresetEditing={exitPresetEditing}
              />
            )}
            
            {view === 'weaknesses' && (
              <WeaknessTracker
                stumbles={stumbles}
                setStumbles={setStumbles}
                surahs={surahs}
                setView={setView}
                setPartnerSubView={setPartnerSubView}
                setMusaffaParams={setMusaffaParams}
                handleSelectSurah={handleSelectSurah}
              />
            )}

            {view === 'audio-manager' && (
              <AudioManager
                surahs={surahs}
                audioDownloadControls={audioDownloadControls}
                reciter={reciter}
                setReciter={setReciter}
                setView={setView}
              />
            )}
            
            {/* Waqar data drives this whole view. Rendering it with
                `waqarData === null` showed an empty "no surahs" list on a
                direct-URL refresh, so wait for the fetch to settle first. */}
            {view === 'mutashabihat-selection' && (waqarPending ? (
              <InlineLoader />
            ) : (
              <MutashabihSelection
                surahs={surahs}
                waqarData={waqarData}
                quranAr={quranAr}
                setView={setView}
                setMultiSurahSession={setMultiSurahSession}
              />
            ))}
            
            {/* `multiSurahSession` is restored from localStorage now, so this
                route survives a refresh instead of rendering nothing. */}
            {view === 'mutashabihat-multi-session' && multiSurahSession && (
              <MutashabihatSession
                key="multi-session"
                multiSurahData={multiSurahSession}
                quranAr={quranAr}
                surahs={surahs}
                onClose={() => setView('mutashabihat-selection')}
              />
            )}
            
            {view === 'detail' && selectedSurah && (
              <SurahDetail
                selectedSurah={selectedSurah}
                surahs={surahs}
                targetAyah={targetAyah}
                handleSelectSurah={handleSelectSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                setView={setView}
                openMusaffaConfig={(s) => { handleSelectSurah(s); setPartnerSubView('config'); setView('partner'); }}
                startQuiz={startQuiz}
                waqarData={waqarData}
                lastRead={lastRead}
                setLastRead={setLastRead}
                reciter={reciter}
              />
            )}
            
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
                onDeletePreset={deletePreset}
                canDeletePreset={canDeletePreset}
                 modelReady={modelReady}
                 modelStatus={modelStatus}
                 ensureModelReady={downloadAndInitModel}
               />
            )}
            
            {/* Waqar entries load after the splash screen, so on a direct-URL
                refresh this view rendered nothing for the whole first paint.
                Show a spinner while pending; `canRenderView` already reroutes
                home if the surah genuinely has no entries. */}
            {view === 'mutashabihat-session' && selectedSurah && (waqarPending ? (
              <InlineLoader />
            ) : waqarData?.[selectedSurah.number] ? (
              <MutashabihatSession
                key={`waqar-${selectedSurah.number}`}
                surah={selectedSurah}
                allSurahEntries={waqarData[selectedSurah.number]}
                quranAr={quranAr}
                surahs={surahs}
                onClose={() => setView('detail')}
              />
            ) : null)}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
};

export default App;
