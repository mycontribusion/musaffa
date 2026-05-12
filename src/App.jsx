import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'

// Components
import Header from './components/Header'
import SurahList from './components/SurahList'
import SurahDetail from './components/SurahDetail'
import PartnerSession from './components/PartnerSession'
import QuizEngine from './components/QuizEngine'
import PartnerMenu from './components/PartnerMenu'

const App = () => {
  const [surahs, setSurahs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState(null)
  const [quranAr, setQuranAr] = useState(null)
  const [quranEn, setQuranEn] = useState(null)
  const [view, setView] = useState('list') 
  const [theme, setTheme] = useState('dark')
  
  const [partnerSubView, setPartnerSubView] = useState('menu') 
  const [quizScore, setQuizScore] = useState(0)
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizFeedback, setQuizFeedback] = useState(null)

  const [musaffaParams, setMusaffaParams] = useState({
    startSurah: 1,
    startAyah: 1,
    endSurah: 1,
    endAyah: 7,
    portion: 'page',
    whoStarts: 'app',
    autoNext: false,
    micSensitivity: 30 // New: Adjustable sensitivity (0-100)
  });

  const mutashabihat = [
    {
      id: 1,
      verse: "وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا",
      options: ["Al-Baqarah", "Al-A'raf", "Al-An'am"],
      correct: "Al-Baqarah",
      explanation: "In Al-Baqarah it says 'Fakulu', while in Al-A'raf it says 'Wakulu'."
    }
  ]

  const [chunks, setChunks] = useState([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null)
  const [mudarasaTurn, setMudarasaTurn] = useState('app') 
  
  const [recentSurahs, setRecentSurahs] = useState(() => {
    const saved = localStorage.getItem('quran_recent')
    return saved ? JSON.parse(saved) : []
  })
  
  const [stumbles, setStumbles] = useState(() => {
    const saved = localStorage.getItem('quran_stumbles')
    return saved ? JSON.parse(saved) : []
  })

  const audioRef = useRef(new Audio())
  const nextAudioRef = useRef(new Audio())
  const currentIndexRef = useRef(0)
  const isInternalNavigation = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const syncStateWithURL = (surahList = surahs) => {
    const params = new URLSearchParams(window.location.search);
    const surahParam = params.get('surah');
    const viewParam = params.get('view');
    const partnerView = params.get('partnerView');
    if (viewParam) setView(viewParam);
    if (partnerView) setPartnerSubView(partnerView);
    if (surahParam) {
      const s = surahList.find(s => s.number === Number(surahParam));
      if (s) setSelectedSurah(s);
    } else {
      setSelectedSurah(null);
    }
  };

  const updateURL = (newView, newSurah, newPartnerView) => {
    if (isInternalNavigation.current) { isInternalNavigation.current = false; return; }
    const params = new URLSearchParams();
    if (newSurah) params.set('surah', newSurah.number);
    if (newView) params.set('view', newView);
    if (newPartnerView && newView === 'partner') params.set('partnerView', newPartnerView);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.pushState({ view: newView, surah: newSurah?.number, partnerView: newPartnerView }, '', newUrl);
    }
  };

  useEffect(() => {
    const handlePopState = () => { isInternalNavigation.current = true; syncStateWithURL(); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surahs]);

  useEffect(() => {
    updateURL(view, selectedSurah, partnerSubView);
  }, [view, selectedSurah, partnerSubView]);

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const sRes = await fetch('/data/surahs.json'); const sData = await sRes.json();
      const surahList = Array.isArray(sData) ? sData : sData.data; setSurahs(surahList);
      const arRes = await fetch('/data/quran-ar.json'); const arData = await arRes.json(); setQuranAr(arData.data || arData);
      const enRes = await fetch('/data/quran-en.json'); const enData = await enRes.json(); setQuranEn(enData.data || enData);
      syncStateWithURL(surahList); setLoading(false);
    } catch (err) { setLoading(false); }
  }

  const handleSelectSurah = (surah) => {
    setSelectedSurah(surah)
    setRecentSurahs(prev => {
      const filtered = prev.filter(s => s.number !== surah.number);
      return [surah, ...filtered].slice(0, 5);
    })
    setMusaffaParams(prev => ({
      ...prev,
      startSurah: surah.number,
      startAyah: 1,
      endSurah: surah.number,
      endAyah: surah.numberOfAyahs
    }));
  }

  const openMusaffaConfig = (surah) => {
    handleSelectSurah(surah); setPartnerSubView('config'); setView('partner');
  }

  const createChunksGlobal = () => {
    const { startSurah, startAyah, endSurah, endAyah, portion } = musaffaParams;
    let allAyahsInRange = [];
    for (let s = startSurah; s <= endSurah; s++) {
      const surahAyahs = quranAr.surahs[s - 1].ayahs;
      let startIdx = (s === startSurah) ? startAyah - 1 : 0;
      let endIdx = (s === endSurah) ? endAyah : surahAyahs.length;
      allAyahsInRange = [...allAyahsInRange, ...surahAyahs.slice(startIdx, endIdx)];
    }
    if (allAyahsInRange.length === 0) return [];
    const newChunks = []; let currentChunk = [];
    if (portion === 'verse') { allAyahsInRange.forEach(a => newChunks.push([a])); }
    else if (portion === 'page') {
      let lastPage = allAyahsInRange[0].page;
      allAyahsInRange.forEach(a => { if (a.page !== lastPage) { newChunks.push(currentChunk); currentChunk = []; lastPage = a.page; } currentChunk.push(a); });
    } else if (portion === 'half') {
      let pageGroups = {}; allAyahsInRange.forEach(a => { if (!pageGroups[a.page]) pageGroups[a.page] = []; pageGroups[a.page].push(a); });
      Object.values(pageGroups).forEach(group => { const mid = Math.ceil(group.length / 2); newChunks.push(group.slice(0, mid)); newChunks.push(group.slice(mid)); });
    } else if (portion === 'third') {
      let pageGroups = {}; allAyahsInRange.forEach(a => { if (!pageGroups[a.page]) pageGroups[a.page] = []; pageGroups[a.page].push(a); });
      Object.values(pageGroups).forEach(group => {
        const t1 = Math.ceil(group.length / 3); const t2 = Math.ceil(2 * group.length / 3);
        newChunks.push(group.slice(0, t1)); newChunks.push(group.slice(t1, t2)); newChunks.push(group.slice(t2));
      });
    } else if (portion === 'rubu') {
      let lastRubu = allAyahsInRange[0].hizbQuarter;
      allAyahsInRange.forEach(a => { if (a.hizbQuarter !== lastRubu) { newChunks.push(currentChunk); currentChunk = []; lastRubu = a.hizbQuarter; } currentChunk.push(a); });
    } else if (portion === 'hizb') {
      let lastHizb = Math.ceil(allAyahsInRange[0].hizbQuarter / 2);
      allAyahsInRange.forEach(a => { const currentHizb = Math.ceil(a.hizbQuarter / 2); if (currentHizb !== lastHizb) { newChunks.push(currentChunk); currentChunk = []; lastHizb = currentHizb; } currentChunk.push(a); });
    }
    if (currentChunk.length) newChunks.push(currentChunk);
    const finalChunks = newChunks.filter(c => c.length > 0); setChunks(finalChunks); return finalChunks;
  }

  const startMusaffa = () => {
    const finalChunks = createChunksGlobal(); if (finalChunks.length === 0) return;
    currentIndexRef.current = 0; setCurrentChunkIndex(0); setPartnerSubView('mudarasa');
    if (musaffaParams.whoStarts === 'app') playCurrentIndex(finalChunks);
    else setMudarasaTurn('user');
  }

  const getAudioUrl = (number) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`;

  const playCurrentIndex = async (currentChunks = chunks) => {
    const idx = currentIndexRef.current; if (idx >= currentChunks.length) { setPartnerSubView('config'); return; }
    setMudarasaTurn('app'); const chunk = currentChunks[idx];
    for (let i = 0; i < chunk.length; i++) {
      const ayah = chunk[i]; setCurrentAyahNumber(ayah.number);
      const nextAyah = chunk[i + 1]; if (nextAyah) { nextAudioRef.current.src = getAudioUrl(nextAyah.number); nextAudioRef.current.load(); }
      await playAyahAudioAsync(ayah.number);
    }
    setCurrentAyahNumber(null); const nextIdx = idx + 1;
    if (nextIdx < currentChunks.length) { currentIndexRef.current = nextIdx; setCurrentChunkIndex(nextIdx); setMudarasaTurn('user'); }
    else setPartnerSubView('config');
  }

  const playAyahAudioAsync = (number) => {
    return new Promise((resolve) => {
      if (nextAudioRef.current.src === getAudioUrl(number)) { const temp = audioRef.current; audioRef.current = nextAudioRef.current; nextAudioRef.current = temp; }
      else audioRef.current.src = getAudioUrl(number);
      audioRef.current.play(); audioRef.current.onended = resolve;
    });
  }

  const handleNextTurnManual = () => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < chunks.length) {
      if (window.navigator.vibrate) window.navigator.vibrate([40, 150]);
      currentIndexRef.current = nextIdx; setCurrentChunkIndex(nextIdx); playCurrentIndex();
    } else { setPartnerSubView('config'); }
  }

  const handleQuizAnswer = (answer) => {
    if (quizFeedback) return
    const isCorrect = answer === mutashabihat[currentQuizIndex].correct
    setQuizFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setQuizScore(prev => prev + 1)
    setTimeout(() => {
      setQuizFeedback(null)
      if (currentQuizIndex < mutashabihat.length - 1) setCurrentQuizIndex(prev => prev + 1)
      else setPartnerSubView('quiz-result')
    }, 2000)
  }

  const startQuiz = () => { setCurrentQuizIndex(0); setQuizScore(0); setQuizFeedback(null); setPartnerSubView('quiz'); setView('partner'); }

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20])
    setStumbles(prev => { if (prev.find(s => s.number === ayah.number)) return prev; return [...prev, { ...ayah, date: new Date().toISOString(), surahName: selectedSurah?.englishName || 'Unknown' }] })
  }

  if (loading) return <div className="loading-screen"><div className="loader" /></div>

  return (
    <div className="app-container">
      <Header theme={theme} setTheme={setTheme} view={view} setView={setView} setPartnerSubView={setPartnerSubView} />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {view === 'list' && <SurahList surahs={surahs} recentSurahs={recentSurahs} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSelectSurah={handleSelectSurah} setView={setView} />}
          {view === 'detail' && selectedSurah && <SurahDetail selectedSurah={selectedSurah} quranAr={quranAr} quranEn={quranEn} setView={setView} openMusaffaConfig={openMusaffaConfig} />}
          {view === 'partner' && partnerSubView === 'menu' && <PartnerMenu setView={setView} startQuiz={startQuiz} />}
          {view === 'partner' && (partnerSubView === 'config' || partnerSubView === 'mudarasa') && <PartnerSession subView={partnerSubView} surahs={surahs} musaffaParams={musaffaParams} setMusaffaParams={setMusaffaParams} startMusaffa={startMusaffa} chunks={chunks} currentChunkIndex={currentChunkIndex} mudarasaTurn={mudarasaTurn} currentAyahNumber={currentAyahNumber} handleNextTurnManual={handleNextTurnManual} logStumble={logStumble} setPartnerSubView={setPartnerSubView} />}
          {view === 'partner' && (partnerSubView === 'quiz' || partnerSubView === 'quiz-result') && <QuizEngine subView={partnerSubView} mutashabihat={mutashabihat} currentQuizIndex={currentQuizIndex} quizScore={quizScore} quizFeedback={quizFeedback} handleQuizAnswer={handleQuizAnswer} startQuiz={startQuiz} setPartnerSubView={setPartnerSubView} />}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
