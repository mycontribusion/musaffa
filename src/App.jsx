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

  const mutashabihat = [
    {
      id: 1,
      verse: "وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا",
      options: ["Al-Baqarah", "Al-A'raf", "Al-An'am"],
      correct: "Al-Baqarah",
      explanation: "In Al-Baqarah it says 'Fakulu', while in Al-A'raf it says 'Wakulu'."
    },
    {
      id: 2,
      verse: "يَا أَيُّهَا الَّذِينَ آمَنُوا كُلُوا مِنْ طَيِّبَاتِ مَا رَزَقْنَاكُمْ وَاشْكُرُوا لِلَّهِ",
      options: ["Al-Baqarah", "Al-Ma'idah", "Al-Mu'minun"],
      correct: "Al-Baqarah",
      explanation: "Al-Baqarah 172 focuses on gratitude after eating from the tayyibat."
    },
    {
      id: 3,
      verse: "قُلْ مَنْ حَرَّمَ زِينَةَ اللَّهِ الَّتِي أَخْرَجَ لِعِبَادِهِ وَالطَّيِّبَاتِ مِنَ الرِّزْقِ",
      options: ["Al-A'raf", "Al-An'am", "Yunus"],
      correct: "Al-A'raf",
      explanation: "A famous verse in Surah Al-A'raf regarding the blessings of Allah."
    }
  ]

  const [chunkSize, setChunkSize] = useState('page') 
  const [chunks, setChunks] = useState([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null)
  const [mudarasaTurn, setMudarasaTurn] = useState('app') 
  const [whoStarts, setWhoStarts] = useState('app') 
  
  const [recentSurahs, setRecentSurahs] = useState(() => {
    const saved = localStorage.getItem('quran_recent')
    return saved ? JSON.parse(saved) : []
  })
  
  const [musaffaStart, setMusaffaStart] = useState(1)
  const [musaffaEnd, setMusaffaEnd] = useState(7)

  const [stumbles, setStumbles] = useState(() => {
    const saved = localStorage.getItem('quran_stumbles')
    return saved ? JSON.parse(saved) : []
  })

  const audioRef = useRef(new Audio())
  const currentIndexRef = useRef(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // URL handling
  const syncStateWithURL = (surahList) => {
    const params = new URLSearchParams(window.location.search);
    const surahParam = params.get('surah');
    const viewParam = params.get('view');
    if (surahParam) {
      const s = surahList.find(s => s.number === Number(surahParam));
      if (s) {
        setSelectedSurah(s);
        setView(viewParam || 'list');
      }
    }
  };

  const updateURL = (newView, newSurah) => {
    const params = new URLSearchParams();
    if (newSurah) params.set('surah', newSurah.number);
    if (newView) params.set('view', newView);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  useEffect(() => {
    localStorage.setItem('quran_recent', JSON.stringify(recentSurahs))
  }, [recentSurahs])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    updateURL(view, selectedSurah);
  }, [view, selectedSurah]);

  const fetchData = async () => {
    try {
      const sRes = await fetch('/data/surahs.json')
      const sData = await sRes.json()
      const surahList = Array.isArray(sData) ? sData : sData.data;
      setSurahs(surahList)
      
      const arRes = await fetch('/data/quran-ar.json')
      const arData = await arRes.json()
      setQuranAr(arData.data || arData)
      
      const enRes = await fetch('/data/quran-en.json')
      const enData = await enRes.json()
      setQuranEn(enData.data || enData)
      
      syncStateWithURL(surahList);
      setLoading(false)
    } catch (err) {
      console.error("Failed to load data", err)
      setLoading(false)
    }
  }

  const handleSelectSurah = (surah) => {
    setSelectedSurah(surah)
    setRecentSurahs(prev => {
      const filtered = prev.filter(s => s.number !== surah.number)
      return [surah, ...filtered].slice(0, 5)
    })
  }

  const openMusaffaConfig = (surah) => {
    setMusaffaStart(1)
    setMusaffaEnd(surah.numberOfAyahs)
    setPartnerSubView('config')
    setView('partner')
  }

  const createChunks = (surahNum, start, end, size) => {
    const allAyahs = quranAr.surahs[surahNum - 1].ayahs
    const ayahs = allAyahs.slice(start - 1, end)
    const newChunks = []
    let currentChunk = []

    if (size === 'page') {
      let lastPage = ayahs[0].page
      ayahs.forEach(a => {
        if (a.page !== lastPage) { newChunks.push(currentChunk); currentChunk = []; lastPage = a.page; }
        currentChunk.push(a)
      })
    } else if (size === 'half-page') {
      let pageGroups = {}
      ayahs.forEach(a => { if (!pageGroups[a.page]) pageGroups[a.page] = []; pageGroups[a.page].push(a); })
      Object.values(pageGroups).forEach(group => {
        const mid = Math.ceil(group.length / 2)
        newChunks.push(group.slice(0, mid)); newChunks.push(group.slice(mid))
      })
    } else if (size === 'rubu') {
      let lastRubu = ayahs[0].hizbQuarter
      ayahs.forEach(a => {
        if (a.hizbQuarter !== lastRubu) { newChunks.push(currentChunk); currentChunk = []; lastRubu = a.hizbQuarter; }
        currentChunk.push(a)
      })
    } else if (size === 'hizb') {
      let lastHizb = Math.ceil(ayahs[0].hizbQuarter / 2)
      ayahs.forEach(a => {
        const currentHizb = Math.ceil(a.hizbQuarter / 2)
        if (currentHizb !== lastHizb) { newChunks.push(currentChunk); currentChunk = []; lastHizb = currentHizb; }
        currentChunk.push(a)
      })
    }
    if (currentChunk.length) newChunks.push(currentChunk)
    setChunks(newChunks)
    return newChunks
  }

  const startMusaffa = () => {
    const newChunks = createChunks(selectedSurah.number, musaffaStart, musaffaEnd, chunkSize)
    currentIndexRef.current = 0
    setCurrentChunkIndex(0)
    setPartnerSubView('mudarasa')
    if (whoStarts === 'app') {
      playCurrentIndex(newChunks)
    } else {
      setMudarasaTurn('user')
    }
  }

  const playCurrentIndex = async (currentChunks = chunks) => {
    const idx = currentIndexRef.current
    if (idx >= currentChunks.length) {
      setPartnerSubView('menu')
      return
    }
    
    setMudarasaTurn('app')
    const chunk = currentChunks[idx]
    for (const ayah of chunk) {
      setCurrentAyahNumber(ayah.number)
      await playAyahAudioAsync(ayah.number)
    }
    setCurrentAyahNumber(null)
    
    const nextIdx = idx + 1
    if (nextIdx < currentChunks.length) {
      currentIndexRef.current = nextIdx
      setCurrentChunkIndex(nextIdx)
      setMudarasaTurn('user')
    } else {
      setPartnerSubView('menu')
    }
  }

  const playAyahAudioAsync = (number) => {
    return new Promise((resolve) => {
      const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`
      audioRef.current.src = url; audioRef.current.play(); audioRef.current.onended = resolve
    })
  }

  const handleNextTurnManual = () => {
    const nextIdx = currentIndexRef.current + 1
    if (nextIdx < chunks.length) {
      if (window.navigator.vibrate) window.navigator.vibrate([40, 150])
      currentIndexRef.current = nextIdx
      setCurrentChunkIndex(nextIdx)
      playCurrentIndex()
    } else {
      setPartnerSubView('menu')
    }
  }

  const handleQuizAnswer = (answer) => {
    if (quizFeedback) return
    const isCorrect = answer === mutashabihat[currentQuizIndex].correct
    setQuizFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setQuizScore(prev => prev + 1)
    
    setTimeout(() => {
      setQuizFeedback(null)
      if (currentQuizIndex < mutashabihat.length - 1) {
        setCurrentQuizIndex(prev => prev + 1)
      } else {
        setPartnerSubView('quiz-result')
      }
    }, 2000)
  }

  const startQuiz = () => {
    setCurrentQuizIndex(0)
    setQuizScore(0)
    setQuizFeedback(null)
    setPartnerSubView('quiz')
    setView('partner')
  }

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20])
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev
      return [...prev, { ...ayah, date: new Date().toISOString(), surahName: selectedSurah?.englishName || 'Unknown' }]
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
      <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-amber-400/30">
      <div className="container mx-auto px-4">
        <Header theme={theme} setTheme={setTheme} view={view} setView={setView} />
        
        <main className="pb-24">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <SurahList 
                surahs={surahs} 
                recentSurahs={recentSurahs}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSelectSurah={handleSelectSurah}
                setView={setView}
              />
            )}

            {view === 'detail' && selectedSurah && (
              <SurahDetail 
                selectedSurah={selectedSurah}
                quranAr={quranAr}
                quranEn={quranEn}
                setView={setView}
                openMusaffaConfig={openMusaffaConfig}
              />
            )}

            {view === 'partner' && partnerSubView === 'menu' && (
              <PartnerMenu setView={setView} startQuiz={startQuiz} />
            )}

            {view === 'partner' && (partnerSubView === 'config' || partnerSubView === 'mudarasa') && (
              <PartnerSession 
                subView={partnerSubView}
                selectedSurah={selectedSurah}
                musaffaStart={musaffaStart}
                setMusaffaStart={setMusaffaStart}
                musaffaEnd={musaffaEnd}
                setMusaffaEnd={setMusaffaEnd}
                whoStarts={whoStarts}
                setWhoStarts={setWhoStarts}
                chunkSize={chunkSize}
                setChunkSize={setChunkSize}
                startMusaffa={startMusaffa}
                chunks={chunks}
                currentChunkIndex={currentChunkIndex}
                mudarasaTurn={mudarasaTurn}
                currentAyahNumber={currentAyahNumber}
                handleNextTurnManual={handleNextTurnManual}
                logStumble={logStumble}
                setPartnerSubView={setPartnerSubView}
              />
            )}

            {view === 'partner' && (partnerSubView === 'quiz' || partnerSubView === 'quiz-result') && (
              <QuizEngine 
                subView={partnerSubView}
                mutashabihat={mutashabihat}
                currentQuizIndex={currentQuizIndex}
                quizScore={quizScore}
                quizFeedback={quizFeedback}
                handleQuizAnswer={handleQuizAnswer}
                startQuiz={startQuiz}
                setPartnerSubView={setPartnerSubView}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
