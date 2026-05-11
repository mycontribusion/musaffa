import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Book, Moon, Sun, ChevronLeft, Volume2, Play, Info, Users, RotateCcw, Eye, EyeOff, SkipForward, Mic, MicOff, Grid, List, Settings, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const App = () => {
  const [surahs, setSurahs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState(null)
  const [quranAr, setQuranAr] = useState(null)
  const [quranEn, setQuranEn] = useState(null)
  const [view, setView] = useState('list') 
  const [listType, setListType] = useState('surah')
  const [theme, setTheme] = useState('dark')
  
  // Partner Mode State
  const [partnerSubView, setPartnerSubView] = useState('menu') 
  const [chunkSize, setChunkSize] = useState('page') 
  const [chunks, setChunks] = useState([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null)
  const [mudarasaTurn, setMudarasaTurn] = useState('app') 
  const [whoStarts, setWhoStarts] = useState('app') // 'app' or 'user'
  const [isListening, setIsListening] = useState(false)
  const [volume, setVolume] = useState(0)
  const [sensitivity, setSensitivity] = useState(15) // Noise threshold
  
  // Musaffa Config
  const [musaffaStart, setMusaffaStart] = useState(1)
  const [musaffaEnd, setMusaffaEnd] = useState(7)

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
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
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
        if (average > sensitivity) resetSilenceTimer()
        setVolume(average)
        requestAnimationFrame(checkVolume)
      }
      checkVolume()
    } catch (err) { console.error("Mic access denied", err) }
  }

  const stopListening = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    if (audioContextRef.current) audioContextRef.current.close()
    clearTimeout(silenceTimerRef.current)
    setIsListening(false)
  }

  const resetSilenceTimer = () => {
    if (mudarasaTurn !== 'user') return
    clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => handleNextTurn(), 15000)
  }

  const pagesList = useMemo(() => Array.from({ length: 604 }, (_, i) => i + 1), [])
  const juzList = useMemo(() => Array.from({ length: 30 }, (_, i) => i + 1), [])
  const hizbList = useMemo(() => Array.from({ length: 60 }, (_, i) => i + 1), [])
  const rubuList = useMemo(() => Array.from({ length: 240 }, (_, i) => i + 1), [])

  const startFromPage = (page) => {
    const sIndex = quranAr.surahs.findIndex(s => s.ayahs.some(a => a.page === page))
    const surah = surahs[sIndex]
    setSelectedSurah(surah)
    openMusaffaConfig(surah)
  }

  const startFromJuz = (juz) => {
    const sIndex = quranAr.surahs.findIndex(s => s.ayahs.some(a => a.juz === juz))
    const surah = surahs[sIndex]
    setSelectedSurah(surah)
    openMusaffaConfig(surah)
  }

  const startFromHizb = (hizb) => {
    const quarter = (hizb - 1) * 2 + 1
    const sIndex = quranAr.surahs.findIndex(s => s.ayahs.some(a => Math.ceil(a.hizbQuarter / 2) === hizb))
    const surah = surahs[sIndex]
    setSelectedSurah(surah)
    openMusaffaConfig(surah)
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
    setCurrentChunkIndex(0)
    setPartnerSubView('mudarasa')
    if (whoStarts === 'app') {
      playChunk(newChunks[0])
    } else {
      setMudarasaTurn('user')
      if (isListening) resetSilenceTimer()
    }
  }

  const playChunk = async (chunk) => {
    setMudarasaTurn('app')
    for (const ayah of chunk) {
      setCurrentAyahNumber(ayah.number)
      await playAyahAudioAsync(ayah.number)
    }
    setCurrentAyahNumber(null)
    setMudarasaTurn('user')
    if (isListening) resetSilenceTimer()
  }

  const playAyahAudioAsync = (number) => {
    return new Promise((resolve) => {
      const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`
      audioRef.current.src = url; audioRef.current.play(); audioRef.current.onended = resolve
    })
  }

  const handleNextTurn = () => {
    clearTimeout(silenceTimerRef.current)
    const nextIdx = currentChunkIndex + 1
    if (nextIdx < chunks.length) {
      if (window.navigator.vibrate) window.navigator.vibrate([30, 100])
      setCurrentChunkIndex(nextIdx)
      if (mudarasaTurn === 'user') {
        playChunk(chunks[nextIdx])
      } else {
        setMudarasaTurn('user')
        if (isListening) resetSilenceTimer()
      }
    } else {
      setPartnerSubView('menu')
      stopListening()
    }
  }

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20])
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev
      return [...prev, { ...ayah, date: new Date().toISOString() }]
    })
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-950"><div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen">
      <main className="container pt-8">
        <AnimatePresence mode="wait">
          {/* Top Header & Navigation */}
          <div className="flex items-center justify-between mb-8 sticky top-0 py-6 bg-slate-950/90 backdrop-blur-xl z-[100] border-b border-white/5 px-2">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tighter">Musaffa</h1>
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setView('list')} 
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' || view === 'detail' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Reader
                </button>
                <button 
                  onClick={() => { setView('partner'); setPartnerSubView('menu'); }} 
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'partner' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Partner
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => isListening ? stopListening() : startListening()} className={`p-2 rounded-full transition-all ${isListening ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300'}`}>
                {isListening ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>

          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                {['surah', 'juz', 'hizb', 'rubu', 'page'].map((t) => (
                  <button key={t} onClick={() => setListType(t)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${listType === t ? 'bg-amber-400 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input type="text" placeholder="Search..." className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="space-y-4">
                {listType === 'surah' && surahs.filter(s => s.englishName.toLowerCase().includes(searchQuery.toLowerCase())).map((surah) => (
                  <div key={surah.number} onClick={() => { setSelectedSurah(surah); setView('detail'); }} className="glass-card p-6 cursor-pointer flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-600">{surah.number}</span>
                      <h3 className="text-xl font-medium">{surah.englishName}</h3>
                    </div>
                    <div className="arabic text-2xl text-slate-400 group-hover:text-amber-400 transition-colors">{surah.name}</div>
                  </div>
                ))}
                {listType === 'juz' && juzList.filter(j => j.toString().includes(searchQuery)).map(j => {
                  const surahOnJuz = quranAr.surahs.find(s => s.ayahs.some(a => a.juz === j))
                  return (
                    <div key={j} onClick={() => startFromJuz(j)} className="glass-card p-6 cursor-pointer flex items-center justify-between group hover:border-amber-400/20">
                      <div className="flex flex-col"><span className="font-bold text-lg">Juz {j}</span><span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{surahOnJuz?.englishName || '...'}</span></div>
                      <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-700 group-hover:text-amber-400 transition-all text-xs font-bold">{j}</div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedSurah && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex items-center justify-between py-4">
                <button onClick={() => setView('list')} className="p-2"><ChevronLeft size={24} /></button>
                <h2 className="text-xl font-bold">{selectedSurah.englishName}</h2>
                <button onClick={() => openMusaffaConfig(selectedSurah)} className="p-2 text-amber-400 bg-amber-400/10 rounded-lg"><Users size={20} /></button>
              </div>
              <div className="space-y-16">
                {quranAr.surahs[selectedSurah.number - 1].ayahs.map((ayah, idx) => (
                  <div key={ayah.number} className="space-y-6 text-center max-w-2xl mx-auto relative px-4">
                    <div className="arabic-text text-4xl md:text-5xl leading-[3] text-white">{ayah.text}</div>
                    <div className="text-slate-500 text-lg italic">{quranEn.surahs[selectedSurah.number - 1].ayahs[idx].text}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {partnerSubView === 'config' && selectedSurah && (
             <motion.div key="config" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto space-y-12 pt-12 pb-24">
               <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold">Session Setup</h2>
                  <p className="text-slate-500">Configure your Musaffa session for {selectedSurah.englishName}</p>
               </div>
               <div className="glass-card p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Who Starts?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setWhoStarts('app')} className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${whoStarts === 'app' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
                        {whoStarts === 'app' && <CheckCircle2 size={14} />} App Starts
                      </button>
                      <button onClick={() => setWhoStarts('user')} className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${whoStarts === 'user' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
                        {whoStarts === 'user' && <CheckCircle2 size={14} />} I Start
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recitation Range</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <span className="text-xs text-slate-600 font-medium">From Ayah</span>
                        <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={musaffaStart} onChange={(e) => setMusaffaStart(Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl focus:border-amber-400/50 text-center" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <span className="text-xs text-slate-600 font-medium">To Ayah</span>
                        <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={musaffaEnd} onChange={(e) => setMusaffaEnd(Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl focus:border-amber-400/50 text-center" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Turn Size</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['half-page', 'page', 'rubu', 'hizb'].map(s => (
                        <button key={s} onClick={() => setChunkSize(s)} className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${chunkSize === s ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                      Mic Sensitivity <span>{sensitivity < 10 ? 'High' : sensitivity > 30 ? 'Quiet' : 'Standard'}</span>
                    </label>
                    <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-white/5">
                      <MicOff size={16} className="text-slate-600" />
                      <input 
                        type="range" 
                        min="5" max="60" step="1" 
                        value={sensitivity} 
                        onChange={(e) => setSensitivity(Number(e.target.value))} 
                        className="flex-1 accent-amber-400 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                      <Mic size={16} className="text-amber-400" />
                    </div>
                    <p className="text-[9px] text-slate-600 italic">"Increase this if the app switches turns too early in a noisy room."</p>
                  </div>
                  <button onClick={startMusaffa} className="w-full py-5 bg-amber-400 text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-400/20 active:scale-95 transition-all">Launch Session</button>
               </div>
             </motion.div>
          )}

          {partnerSubView === 'mudarasa' && chunks[currentChunkIndex] && (
            <motion.div key="mudarasa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 text-center pt-8 max-w-3xl mx-auto pb-32">
              <div className="flex items-center justify-between sticky top-0 py-6 bg-slate-950/80 backdrop-blur-md z-50 px-2">
                <button onClick={() => setPartnerSubView('config')} className="p-2"><ChevronLeft size={24} /></button>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${mudarasaTurn === 'app' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-bold uppercase tracking-widest">{mudarasaTurn === 'app' ? "App Reciting" : "Your Turn"}</span>
                </div>
                <div className="w-10" />
              </div>
              <div className={`p-8 md:p-12 rounded-[3rem] transition-all duration-700 min-h-[500px] flex flex-col justify-start overflow-y-auto ${mudarasaTurn === 'app' ? 'bg-amber-400/5 border border-amber-400/10 shadow-xl shadow-amber-400/5' : 'bg-emerald-400/5 border border-emerald-400/20 shadow-xl shadow-emerald-400/5'}`}>
                <div className="space-y-10">
                   <div className="arabic-text text-3xl md:text-5xl leading-[2.5] text-right dir-rtl">
                     {chunks[currentChunkIndex].map((ayah) => (
                       <span key={ayah.number} className={`inline transition-colors duration-500 ${currentAyahNumber === ayah.number ? 'text-amber-400 scale-110 inline-block' : 'opacity-80'}`}>
                         {ayah.text} 
                         <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-current text-[10px] mx-2 align-middle opacity-30">{ayah.numberInSurah}</span>
                       </span>
                     ))}
                   </div>
                   {mudarasaTurn === 'user' && (
                     <div className="space-y-12 pt-12 border-t border-emerald-400/10">
                       <div className="flex flex-col items-center gap-8">
                         <div className="relative">
                            {/* PWA Resonating Sign - Waveform & Pulsing Mic */}
                            <motion.div 
                              className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl"
                              animate={{ 
                                scale: [1, 1 + (volume / 25), 1],
                                opacity: [0.3, 0.6, 0.3]
                              }}
                              transition={{ duration: 0.2 }}
                            />
                            
                            {/* Waveform Bars */}
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-16 w-48 justify-center">
                              {[0.3, 0.5, 0.8, 1, 0.8, 0.5, 0.3, 0.6, 0.9, 0.7, 0.4].map((factor, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 bg-emerald-400/80 rounded-full"
                                  animate={{ 
                                    height: `${Math.max(15, (volume * factor * 2))}%` 
                                  }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                />
                              ))}
                            </div>

                            <motion.div 
                              className="relative w-28 h-28 bg-emerald-400/10 rounded-full flex items-center justify-center border border-emerald-400/40 shadow-2xl shadow-emerald-400/20"
                              animate={{ scale: 1 + (volume / 100) }}
                              transition={{ duration: 0.1 }}
                            >
                              <Mic className="text-emerald-400" size={48} />
                            </motion.div>
                         </div>
                         
                         <div className="space-y-3 mt-12">
                           <p className="text-emerald-400 font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">Recite Now</p>
                           <p className="text-slate-600 text-[10px] font-medium max-w-[200px] mx-auto leading-relaxed">The App is tracking your voice. Stop for 15s to switch turns.</p>
                         </div>
                         <div className="flex gap-4 pt-4">
                           <button onClick={() => logStumble(chunks[currentChunkIndex][0])} className="px-6 py-3 border border-red-400/20 text-red-400 rounded-xl font-bold uppercase tracking-widest text-[8px]">I Stumbled</button>
                           <button onClick={handleNextTurn} className="px-12 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">Next Part</button>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'partner' && partnerSubView === 'menu' && (
            <motion.div key="partner-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 text-center pt-8">
              <h1 className="text-4xl font-bold tracking-tighter">Partner Mode</h1>
              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                 {stumbles.length > 0 && (
                   <button onClick={() => setPartnerSubView('stumbles')} className="glass-card p-10 text-left border-red-400/20">
                     <div className="text-red-400 font-bold uppercase tracking-widest text-[10px]">Review ({stumbles.length})</div>
                     <h3 className="text-2xl font-bold">Stumble Log</h3>
                   </button>
                 )}
                 <button onClick={() => setView('list')} className="glass-card p-10 text-left border-amber-400/20">
                    <h3 className="text-2xl font-bold">Start Musaffa</h3>
                    <p className="text-slate-500 text-sm">Select from Reader to begin.</p>
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
