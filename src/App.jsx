import React, { useState, useEffect, useRef } from 'react'
import { Search, Book, Moon, Sun, ChevronLeft, Volume2, Play, Info, Users, RotateCcw, Eye, EyeOff, SkipForward, Mic, MicOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const App = () => {
  const [surahs, setSurahs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState(null)
  const [quranAr, setQuranAr] = useState(null)
  const [quranEn, setQuranEn] = useState(null)
  const [view, setView] = useState('list') 
  
  // Partner Mode State
  const [partnerSubView, setPartnerSubView] = useState('menu') 
  const [chunkSize, setChunkSize] = useState('page') // 'half-page', 'page', 'rubu', 'hizb'
  const [chunks, setChunks] = useState([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [mudarasaTurn, setMudarasaTurn] = useState('app') // 'app' or 'user'
  const [isListening, setIsListening] = useState(false)
  
  const [stumbles, setStumbles] = useState(() => {
    const saved = localStorage.getItem('quran_stumbles')
    return saved ? JSON.parse(saved) : []
  })

  const audioRef = useRef(new Audio())
  const silenceTimerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('quran_stumbles', JSON.stringify(stumbles))
  }, [stumbles])

  useEffect(() => {
    fetchData()
    return () => stopListening()
  }, [])

  const fetchData = async () => {
    try {
      const sRes = await fetch('/data/surahs.json')
      const sData = await sRes.json()
      setSurahs(Array.isArray(sData) ? sData : sData.data)
      
      const arRes = await fetch('/data/quran-ar.json')
      const arData = await arRes.json()
      setQuranAr(arData.data || arData)

      const enRes = await fetch('/data/quran-en.json')
      const enData = await enRes.json()
      setQuranEn(enData.data || enData)
      
      setLoading(false)
    } catch (err) {
      console.error("Failed to load data", err)
      setLoading(false)
    }
  }

  // --- Voice Activity Detection (VAD) ---
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 512
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      setIsListening(true)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const checkVolume = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
        const average = sum / bufferLength

        if (average > 15) { // Threshold for "speaking"
          resetSilenceTimer()
        }
        requestAnimationFrame(checkVolume)
      }
      checkVolume()
    } catch (err) {
      console.error("Mic access denied", err)
    }
  }

  const stopListening = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    clearTimeout(silenceTimerRef.current)
    setIsListening(false)
  }

  const resetSilenceTimer = () => {
    if (mudarasaTurn !== 'user') return
    clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      console.log("20s silence detected, App's turn.")
      handleNextTurn()
    }, 20000)
  }

  // --- Chunking Logic ---
  const createChunks = (surahNum, size) => {
    const ayahs = quranAr.surahs[surahNum - 1].ayahs
    const newChunks = []
    let currentChunk = []

    if (size === 'page') {
      let lastPage = ayahs[0].page
      ayahs.forEach(a => {
        if (a.page !== lastPage) {
          newChunks.push(currentChunk)
          currentChunk = []
          lastPage = a.page
        }
        currentChunk.push(a)
      })
      if (currentChunk.length) newChunks.push(currentChunk)
    } else if (size === 'half-page') {
      // Crude half-page: group by page, then split each group in two
      let pageGroups = {}
      ayahs.forEach(a => {
        if (!pageGroups[a.page]) pageGroups[a.page] = []
        pageGroups[a.page].push(a)
      })
      Object.values(pageGroups).forEach(group => {
        const mid = Math.ceil(group.length / 2)
        newChunks.push(group.slice(0, mid))
        newChunks.push(group.slice(mid))
      })
    } else if (size === 'rubu') {
      let lastRubu = ayahs[0].hizbQuarter
      ayahs.forEach(a => {
        if (a.hizbQuarter !== lastRubu) {
          newChunks.push(currentChunk)
          currentChunk = []
          lastRubu = a.hizbQuarter
        }
        currentChunk.push(a)
      })
      if (currentChunk.length) newChunks.push(currentChunk)
    } else if (size === 'hizb') {
      let lastHizb = Math.ceil(ayahs[0].hizbQuarter / 2)
      ayahs.forEach(a => {
        const currentHizb = Math.ceil(a.hizbQuarter / 2)
        if (currentHizb !== lastHizb) {
          newChunks.push(currentChunk)
          currentChunk = []
          lastHizb = currentHizb
        }
        currentChunk.push(a)
      })
      if (currentChunk.length) newChunks.push(currentChunk)
    }

    setChunks(newChunks)
    return newChunks
  }

  const startMusaffa = (surahNum, size) => {
    const newChunks = createChunks(surahNum, size)
    setCurrentChunkIndex(0)
    setMudarasaTurn('app')
    setPartnerSubView('mudarasa')
    playChunk(newChunks[0])
  }

  const playChunk = async (chunk) => {
    setMudarasaTurn('app')
    for (const ayah of chunk) {
      await playAyahAudioAsync(ayah.number)
    }
    setMudarasaTurn('user')
    if (isListening) resetSilenceTimer()
  }

  const playAyahAudioAsync = (number) => {
    return new Promise((resolve) => {
      const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`
      audioRef.current.src = url
      audioRef.current.play()
      audioRef.current.onended = resolve
    })
  }

  const handleNextTurn = () => {
    clearTimeout(silenceTimerRef.current)
    const nextIdx = currentChunkIndex + 1
    if (nextIdx < chunks.length) {
      setCurrentChunkIndex(nextIdx)
      playChunk(chunks[nextIdx])
    } else {
      setPartnerSubView('menu')
      stopListening()
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-950"><div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen pb-24">
      <main className="container pt-12">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Quran</h1>
                <div className="flex gap-4">
                   <button onClick={() => isListening ? stopListening() : startListening()} className={`p-2 rounded-full ${isListening ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500'}`}>
                    {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>
                  <button className="p-2 text-slate-500"><Moon size={20} /></button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input type="text" placeholder="Search Surah..." className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="space-y-4">
                {surahs.filter(s => s.englishName.toLowerCase().includes(searchQuery.toLowerCase())).map((surah) => (
                  <div key={surah.number} onClick={() => { setSelectedSurah(surah); setView('detail'); }} className="glass-card p-6 cursor-pointer flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-600">{surah.number}</span>
                      <h3 className="text-xl font-medium">{surah.englishName}</h3>
                    </div>
                    <div className="arabic text-2xl text-slate-400">{surah.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedSurah && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex items-center justify-between sticky top-0 py-6 bg-slate-950/80 backdrop-blur-md z-50">
                <button onClick={() => setView('list')} className="p-2"><ChevronLeft size={24} /></button>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{selectedSurah.englishName}</h2>
                </div>
                <div className="flex gap-2">
                  <select onChange={(e) => setChunkSize(e.target.value)} value={chunkSize} className="bg-slate-900 text-xs border border-white/5 rounded-lg px-2">
                    <option value="half-page">Half Page</option>
                    <option value="page">Full Page</option>
                    <option value="rubu">Rub'u (1/4 Hizb)</option>
                    <option value="hizb">Full Hizb</option>
                  </select>
                  <button onClick={() => startMusaffa(selectedSurah.number, chunkSize)} className="p-2 text-amber-400 bg-amber-400/10 rounded-lg"><Users size={20} /></button>
                </div>
              </div>
              <div className="space-y-16">
                {quranAr.surahs[selectedSurah.number - 1].ayahs.map((ayah, idx) => (
                  <div key={ayah.number} className="space-y-6 text-center max-w-2xl mx-auto">
                    <div className="arabic-text text-4xl md:text-5xl leading-[3] text-white">{ayah.text}</div>
                    <div className="text-slate-500 text-lg italic">{quranEn.surahs[selectedSurah.number - 1].ayahs[idx].text}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {partnerSubView === 'mudarasa' && chunks[currentChunkIndex] && (
            <motion.div key="mudarasa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 text-center pt-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <button onClick={() => setPartnerSubView('menu')} className="p-2"><ChevronLeft size={24} /></button>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${mudarasaTurn === 'app' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-bold uppercase tracking-widest">{mudarasaTurn === 'app' ? "App is Reciting" : "Your Turn"}</span>
                </div>
                <div className="w-10" />
              </div>

              <div className={`p-8 md:p-12 rounded-[3rem] transition-all duration-700 min-h-[500px] flex flex-col justify-start overflow-y-auto ${mudarasaTurn === 'app' ? 'bg-amber-400/5 border border-amber-400/10' : 'bg-emerald-400/5 border border-emerald-400/20'}`}>
                <div className="space-y-10">
                   <div className="arabic-text text-3xl md:text-5xl leading-[2.5] text-right dir-rtl">
                     {chunks[currentChunkIndex].map((ayah, idx) => (
                       <span key={ayah.number} className="inline">
                         {ayah.text} 
                         <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-current text-[10px] mx-2 align-middle opacity-30">
                           {ayah.numberInSurah}
                         </span>
                       </span>
                     ))}
                   </div>
                   
                   {mudarasaTurn === 'user' && (
                     <div className="space-y-8 pt-12 border-t border-emerald-400/10">
                       <div className="flex items-center justify-center gap-3">
                         <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                         <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Listening to your recitation...</p>
                       </div>
                       <div className="flex flex-col items-center gap-6">
                         <button onClick={handleNextTurn} className="px-12 py-4 bg-white text-slate-950 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform">Finish Turn Manually</button>
                         <p className="text-slate-600 text-[10px]">App will take over after 20s of silence.</p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="text-slate-600 text-xs font-bold">Chunk {currentChunkIndex + 1} of {chunks.length}</div>
            </motion.div>
          )}

          {view === 'partner' && partnerSubView === 'menu' && (
            <motion.div key="partner-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 text-center pt-8">
              <h1 className="text-4xl font-bold">Musaffa Mode</h1>
              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                 <p className="text-slate-500">Pick a Surah from the Reader, set your chunk size, and start your partner session.</p>
                 <button onClick={() => setView('list')} className="glass-card p-10 text-left space-y-2 hover:border-amber-400/50">
                    <h3 className="text-2xl font-bold">Go to Reader</h3>
                    <p className="text-slate-500 text-sm">Select a Surah to start Musaffa Partner mode.</p>
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 px-12 flex items-center justify-center gap-16">
        <button onClick={() => setView('list')} className={`flex flex-col items-center gap-2 ${view === 'list' || view === 'detail' ? 'text-amber-400' : 'text-slate-600'}`}>
          <Book size={20} /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Reader</span>
        </button>
        <button onClick={() => { setView('partner'); setPartnerSubView('menu'); }} className={`flex flex-col items-center gap-2 ${view === 'partner' ? 'text-amber-400' : 'text-slate-600'}`}>
          <Users size={20} /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Partner</span>
        </button>
      </nav>
    </div>
  )
}

export default App
