import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import HomeControls from './components/HomeControls';
import AudioManager from './components/AudioManager';
import RecitationMap from './components/RecitationMap';
import SurahList from './components/SurahList';
import SearchPage from './components/SearchPage';
import SurahDetail from './components/SurahDetail';
import JuzDetail from './components/JuzDetail';
import HizbDetail from './components/HizbDetail';
import PartnerSession from './components/PartnerSession';
import MutashabihatSession from './components/MutashabihatSession';
import MutashabihSelection from './components/MutashabihSelection';
import SettingsPage from './components/SettingsPage';
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
 *  - `detail`                 — Surah Detail     (`SurahDetail`)
 *  - `mutashabihat-selection` — Mutashabih Quiz (`MutashabihSelection`)
 *  - `mutashabihat-multi-session` — Mutashabih Quiz session (`MutashabihatSession`)
 *  - `settings`               — Settings           (`SettingsPage`)
 *
 * Every other view keeps the global header exactly as it is today. The local
 * headers of those views no longer need to offset themselves past the global
 * header, so they pin to `top: 0` instead.
 */
const VIEWS_WITHOUT_GLOBAL_HEADER = new Set([
  'detail',
  'juz',
  'hizb',
  'mutashabihat-selection',
  'mutashabihat-multi-session',
  'settings',
  'recitation-map',
  'audio-manager',
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
  const [selectedJuz, setSelectedJuz] = useState(null);
  const [selectedHizb, setSelectedHizb] = useState(null);
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
  const [detailReturnView, setDetailReturnView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const isSwipeTransition = useRef(false);

  const DEFAULT_PARAMS = { startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 286, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false, errorThreshold: 50, stuckTimerDuration: 5 };
  
  const [musaffaParams, setMusaffaParams] = useLocalStorageState('quran_musaffa_params', DEFAULT_PARAMS);
  const [reciter, setReciter] = useLocalStorageState('quran_reciter', 'ar.saoodshuraym', true);
  const [recentSurahs, setRecentSurahs] = useLocalStorageState('quran_recent', []);
  const [lastRead, setLastRead] = useLocalStorageState('quran_last_read', []);
  const [detailForceStart, setDetailForceStart] = useState(false);

  /**
   * Add or update a last-read entry, keeping at most 5 entries sorted by recency.
   * Backward compatible: if stored value is a single object (old format), wraps it in an array.
   */
  const updateLastRead = useCallback((entry) => {
    setLastRead(prev => {
      // Backward compatibility: if prev is not an array, wrap it
      const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
      const { surahNumber, ayahNumber, mode = 'surah', divisionNumber } = entry;
      const key = `${surahNumber}:${mode}:${divisionNumber || 0}`;

      // Remove existing entry with same key if present
      const filtered = arr.filter(e => `${e.surahNumber}:${e.mode || 'surah'}:${e.divisionNumber || 0}` !== key);

      // Add new entry at front
      const next = [{ surahNumber, ayahNumber, mode, divisionNumber, updatedAt: Date.now() }, ...filtered];

      // Keep max 5
      return next.slice(0, 5);
    });
  }, [setLastRead]);
  const [wordResults, setWordResults] = useLocalStorageState('quran_word_results', {});
  const [stumbles, setStumbles] = useLocalStorageState('quran_stumbles', []);

  // `logStumble` and the `stumbles`/`WeaknessTracker` Mistake Book state are
  // intentionally retained (not removed). The Recitation Map now surfaces
  // word-level Smart Mode results via `wordResults`, but the old Mistake Book
  // storage key is left untouched so existing user data is not lost. The
  // automatic per-ayat logging call in PartnerSession has been removed.
  // `logStumble` is defined below (near `handleSelectSurah`) and is still
  // passed to PartnerSession so the in-session "Log Stumble" buttons keep
  // working for users who want to flag an ayah manually.

  const syncStateWithURL = useCallback((sList) => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const p = new URLSearchParams(window.location.search);

    let s = sList.find(x => x.number === Number(p.get('surah')));
    let v = p.get('view') || 'list';
    let pv = p.get('partnerView') || 'config';

    if (parts.length > 0) {
      if (parts[0] === 'search') {
        v = 'search';
      } else if (parts[0] === 'surah' && parts[1]) {
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
      } else if (parts[0] === 'juz' && parts[1]) {
        v = 'juz';
        setSelectedJuz(Number(parts[1]));
      } else if (parts[0] === 'hizb' && parts[1]) {
        v = 'hizb';
        setSelectedHizb(Number(parts[1]));
      } else if (parts[0] === 'settings') {
        v = 'settings';
      } else if (parts[0] === 'recitation-map') {
        v = 'recitation-map';
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
      case 'juz':
        return !!selectedJuz && selectedJuz >= 1 && selectedJuz <= 30;
      case 'hizb':
        return !!selectedHizb && selectedHizb >= 1 && selectedHizb <= 60;
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
  }, [view, selectedSurah, selectedJuz, selectedHizb, multiSurahSession, waqarPending, waqarData, partnerSubView, chunks.length, savedMusaffaSession]);

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
    } else if (view === 'juz' && selectedJuz) {
      newPath = `/juz/${selectedJuz}`;
    } else if (view === 'hizb' && selectedHizb) {
      newPath = `/hizb/${selectedHizb}`;
    } else if (view === 'partner') {
      newPath = selectedSurah ? `/surah/${selectedSurah.number}/partner/${partnerSubView}` : `/partner/${partnerSubView}`;
    } else if (view === 'mutashabihat-session' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}/mutashabihat`;
    } else if (view === 'mutashabihat-selection') {
      newPath = `/mutashabihat/custom`;
    } else if (view === 'mutashabihat-multi-session') {
      newPath = `/mutashabihat/session`;
    } else if (view === 'search') {
      newPath = `/search`;
    } else if (view === 'settings') {
      newPath = `/settings`;
    } else if (view === 'recitation-map') {
      newPath = `/recitation-map`;
    } else if (view === 'audio-manager') {
      newPath = `/audio-manager`;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      if (window.location.search) {
        window.history.replaceState({ view }, '', newPath);
      } else {
        // During swipe transitions use replaceState so duplicate history
        // entries do not accumulate when swiping between consecutive details.
        if (isSwipeTransition.current) {
          window.history.replaceState({ view }, '', newPath);
          isSwipeTransition.current = false;
        } else {
          window.history.pushState({ view }, '', newPath);
        }
      }
    }
  }, [view, selectedSurah, partnerSubView, loading, error, canRenderView]);

  // Tracks the scroll position of the homepage (surah list) and search page
  // so that returning from a surah detail view re-opens where the user left off.
  const listScrollPosition = useRef(0);
  const searchScrollPosition = useRef(0);
  const isRestoringScroll = useRef(false);
  const prevViewRef = useRef(view);

  // Track the homepage scroll position while the user is on it
  useEffect(() => {
    if (view !== 'list') return;
    const t = setTimeout(() => {
      isRestoringScroll.current = false;
    }, 400);

    const onScroll = () => {
      if (!isRestoringScroll.current) {
        listScrollPosition.current = window.scrollY;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [view]);

  // Track search scroll position while active
  useEffect(() => {
    if (view !== 'search') return;
    const t = setTimeout(() => {
      isRestoringScroll.current = false;
    }, 400);

    const onScroll = () => {
      if (!isRestoringScroll.current) {
        searchScrollPosition.current = window.scrollY;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [view]);

  // Global Scroll Reset: Only runs when route view actually changes
  useEffect(() => {
    const previous = prevViewRef.current;
    if (previous === view) return;
    prevViewRef.current = view;

    if (view === 'list' && previous === 'detail') {
      isRestoringScroll.current = true;
      // Restoration is executed directly by SurahList on mount
    } else if (view === 'search' && previous === 'detail') {
      isRestoringScroll.current = true;
      // Restoration is executed directly by SearchPage on mount
    } else if (view === 'detail' || view === 'juz' || view === 'hizb') {
      if (!targetAyah) {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [view, targetAyah]);

  const handleSelectSurah = (s, returnView = 'list') => {
    if (view === 'list') {
      listScrollPosition.current = window.scrollY;
    }
    setSelectedSurah(s);
    setRecentSurahs(p => {
      const updated = [s, ...p.filter(x => x.number !== s.number)].slice(0, 5);
      return updated;
    });
    // Clear any search-directed ayah jump; normal browsing resumes last-read behaviour.
    setTargetAyah(null);
    if (returnView !== null) {
      setDetailReturnView(returnView);
    }
    setMusaffaParams(p => ({ ...p, startSurah: s.number, startAyah: 1, endSurah: s.number, endAyah: s.numberOfAyahs }));
  };

  /**
   * Open the musaffa config view with the right range pre-filled.
   *
   * A surah selection (full surah object) has no `startSurah`, so it delegates
   * to `handleSelectSurah`, which sets musaffaParams to the whole surah.
   * A juz/hizb selection carries an explicit `{ startSurah, startAyah, endSurah, endAyah }`
   * range, which is applied directly so musaffa covers the entire division —
   * start from the beginning, end at the end — just like starting from a surah.
   */
  const openMusaffaConfig = useCallback((selection) => {
    if (selection && selection.startSurah != null && selection.endSurah != null) {
      setMusaffaParams(p => ({
        ...p,
        startSurah: selection.startSurah,
        startAyah: selection.startAyah,
        endSurah: selection.endSurah,
        endAyah: selection.endAyah,
      }));
    } else {
      handleSelectSurah(selection);
    }
    setPartnerSubView('config');
    setView('partner');
  }, [handleSelectSurah, setMusaffaParams, setPartnerSubView, setView]);

  /**
   * Open a surah and scroll straight to a specific ayah.
   * Used by Quran search results. Reuses the existing detail view and the
   * existing `targetAyah` scroll mechanism in SurahDetail — no parallel
   * navigation system. A null targetAyah means "use last-read behaviour".
   */
  const handleOpenAyah = (surahNumber, ayahNumber) => {
    if (view === 'search') {
      searchScrollPosition.current = window.scrollY;
    }
    const s = surahs.find(x => x.number === surahNumber);
    if (!s) return;
    setSelectedSurah(s);
    setRecentSurahs(p => [s, ...p.filter(x => x.number !== s.number)].slice(0, 5));
    setTargetAyah(ayahNumber || null);
    setDetailReturnView('search');
    setView('detail');
  };

  const handleDetailBack = () => {
    // Explicit state reset: exit the detail view entirely and return to the
    // previous main/list view. Do NOT use window.history.back() — that would
    // step through intermediate detail pages accumulated during swipe
    // navigation. Clear all selected detail state and set the view directly.
    setSelectedSurah(null);
    setSelectedJuz(null);
    setSelectedHizb(null);
    setView(detailReturnView || 'list');
    window.history.replaceState({}, '', '/');
  };

  const setIsSwipeTransition = useCallback((val) => {
    isSwipeTransition.current = val;
  }, []);

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
          view={view}
          theme={theme}
          setTheme={setTheme}
          setView={setView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
            {view === 'search' && (
              <SearchPage
                surahs={surahs}
                quranAr={quranAr}
                quranEn={quranEn}
                searchQuery={searchQuery}
                openAyah={handleOpenAyah}
                initialScrollPos={searchScrollPosition.current}
              />
            )}

            {view === 'settings' && (
              <SettingsPage setView={setView} />
            )}

            {view === 'recitation-map' && (
              <RecitationMap
                surahs={surahs}
                quranAr={quranAr}
                quranSimple={quranSimple}
                wordResults={wordResults}
                setView={setView}
                returnView="settings"
              />
            )}

            {view === 'audio-manager' && (
              <AudioManager
                surahs={surahs}
                audioDownloadControls={audioDownloadControls}
                reciter={reciter}
                setReciter={setReciter}
                setView={setView}
                returnView="settings"
              />
            )}

            {view === 'list' && (
              <SurahList
                surahs={surahs}
                quranAr={quranAr}
                quranEn={quranEn}
                recentSurahs={recentSurahs}
                lastRead={lastRead}
                updateLastRead={updateLastRead}
                handleSelectSurah={handleSelectSurah}
                openAyah={handleOpenAyah}
                setTargetAyah={setTargetAyah}
                setDetailForceStart={setDetailForceStart}
                setDetailReturnView={setDetailReturnView}
                setView={setView}
                setSelectedJuz={setSelectedJuz}
                setSelectedHizb={setSelectedHizb}
                initialScrollPos={listScrollPosition.current} 
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
                setTargetAyah={setTargetAyah}
                handleSelectSurah={handleSelectSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                setView={setView}
                setIsSwipeTransition={setIsSwipeTransition}
                onBack={handleDetailBack}
                openMusaffaConfig={openMusaffaConfig}
                startQuiz={startQuiz}
                waqarData={waqarData}
                lastRead={lastRead}
                updateLastRead={updateLastRead}
                reciter={reciter}
                forceStart={detailForceStart}
                setForceStart={setDetailForceStart}
              />
            )}

            {view === 'juz' && selectedJuz && (
              <JuzDetail
                juzNumber={selectedJuz}
                surahs={surahs}
                handleSelectSurah={handleSelectSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                setView={setView}
                setSelectedJuz={setSelectedJuz}
                setIsSwipeTransition={setIsSwipeTransition}
                onBack={handleDetailBack}
                openMusaffaConfig={openMusaffaConfig}
                waqarData={waqarData}
                lastRead={lastRead}
                updateLastRead={updateLastRead}
                reciter={reciter}
                targetAyah={targetAyah}
                setTargetAyah={setTargetAyah}
                forceStart={detailForceStart}
                setForceStart={setDetailForceStart}
              />
            )}

            {view === 'hizb' && selectedHizb && (
              <HizbDetail
                hizbNumber={selectedHizb}
                surahs={surahs}
                handleSelectSurah={handleSelectSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                setView={setView}
                setSelectedHizb={setSelectedHizb}
                setIsSwipeTransition={setIsSwipeTransition}
                onBack={handleDetailBack}
                openMusaffaConfig={openMusaffaConfig}
                waqarData={waqarData}
                lastRead={lastRead}
                updateLastRead={updateLastRead}
                reciter={reciter}
                targetAyah={targetAyah}
                setTargetAyah={setTargetAyah}
                forceStart={detailForceStart}
                setForceStart={setDetailForceStart}
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
                setView={setView}
                wordResults={wordResults}
                setWordResults={setWordResults}
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
