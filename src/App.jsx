import React, { useState, useEffect, useRef } from 'react'
import { Search, Book, Moon, Sun, ChevronLeft, Volume2, Play, Info, Users, RotateCcw, Eye, EyeOff, SkipForward } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const App = () => {
  const [surahs, setSurahs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState(null)
  const [quranAr, setQuranAr] = useState(null)
  const [quranEn, setQuranEn] = useState(null)
  const [view, setView] = useState('list') // 'list', 'detail', 'partner'
  
  // Partner Mode State
  const [partnerSubView, setPartnerSubView] = useState('menu') 
  const [currentAyah, setCurrentAyah] = useState(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stumbles, setStumbles] = useState(() => {
    const saved = localStorage.getItem('quran_stumbles')
    return saved ? JSON.parse(saved) : []
  })
  const audioRef = useRef(new Audio())

  useEffect(() => {
    localStorage.setItem('quran_stumbles', JSON.stringify(stumbles))
  }, [stumbles])

  useEffect(() => {
    fetchData()
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

  const playAyahAudio = (number) => {
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`
    audioRef.current.src = url
    audioRef.current.play()
    setIsPlaying(true)
    audioRef.current.onended = () => setIsPlaying(false)
  }

  const stopAudio = () => {
    audioRef.current.pause()
    setIsPlaying(false)
  }

  const startNewPrompt = () => {
    if (!quranAr) return
    const allAyahs = quranAr.surahs.flatMap(s => s.ayahs.map(a => ({...a, surahName: s.englishName, surahNumber: s.number})))
    const randomAyah = allAyahs[Math.floor(Math.random() * allAyahs.length)]
    setCurrentAyah(randomAyah)
    setIsRevealed(false)
    playAyahAudio(randomAyah.number)
  }

  const [mudarasaSurah, setMudarasaSurah] = useState(1)
  const [mudarasaIndex, setMudarasaIndex] = useState(0)
  const [mudarasaTurn, setMudarasaTurn] = useState('app')

  const startMudarasa = (surahNum) => {
    setMudarasaSurah(surahNum)
    setMudarasaIndex(0)
    setMudarasaTurn('app')
    setPartnerSubView('mudarasa')
    playMudarasaAyah(surahNum, 0)
  }

  const playMudarasaAyah = (surahNum, ayahIdx) => {
    const ayah = quranAr.surahs[surahNum - 1].ayahs[ayahIdx]
    setCurrentAyah({...ayah, surahName: quranAr.surahs[surahNum - 1].englishName})
    playAyahAudio(ayah.number)
    setMudarasaTurn('app')
  }

  const nextMudarasaTurn = () => {
    if (mudarasaTurn === 'app') {
      setMudarasaTurn('user')
      stopAudio()
      if (window.navigator.vibrate) window.navigator.vibrate(10)
    } else {
      const nextIdx = mudarasaIndex + 1
      if (nextIdx < quranAr.surahs[mudarasaSurah - 1].ayahs.length) {
        setMudarasaIndex(nextIdx)
        playMudarasaAyah(mudarasaSurah, nextIdx)
      } else {
        setPartnerSubView('menu')
      }
    }
  }

  const logStumble = (ayah) => {
    if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20])
    setStumbles(prev => {
      if (prev.find(s => s.number === ayah.number)) return prev
      return [...prev, { ...ayah, date: new Date().toISOString() }]
    })
  }

  const filteredSurahs = surahs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString() === searchQuery
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <main className="container pt-12">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Quran</h1>
                <button className="p-2 text-slate-500"><Moon size={20} /></button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Surah..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                {filteredSurahs.map((surah) => (
                  <div key={surah.number} onClick={() => { setSelectedSurah(surah); setView('detail'); window.scrollTo(0, 0); }} className="glass-card p-6 cursor-pointer flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-600 group-hover:text-amber-400 transition-colors">{surah.number.toString().padStart(3, '0')}</span>
                      <h3 className="text-xl font-medium">{surah.englishName}</h3>
                    </div>
                    <div className="arabic text-2xl text-slate-400 group-hover:text-amber-400 transition-colors">{surah.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedSurah && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex items-center justify-between sticky top-0 py-6 bg-slate-950/80 backdrop-blur-md z-50">
                <button onClick={() => setView('list')} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{selectedSurah.englishName}</h2>
                </div>
                <button onClick={() => startMudarasa(selectedSurah.number)} className="p-2 text-amber-400"><Users size={20} /></button>
              </div>

              <div className="space-y-16">
                {quranAr.surahs[selectedSurah.number - 1].ayahs.map((ayah, idx) => (
                  <div key={ayah.number} className="space-y-6 text-center max-w-2xl mx-auto">
                    <div className="arabic-text text-4xl md:text-5xl leading-[3] text-white">{ayah.text}</div>
                    <div className="text-slate-500 text-lg font-light italic leading-relaxed">
                      {quranEn.surahs[selectedSurah.number - 1].ayahs[idx].text}
                    </div>
                    <div className="flex justify-center gap-4 pt-4">
                       <span className="text-[10px] text-slate-700 font-bold tracking-widest">{selectedSurah.number}:{idx+1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'partner' && (
            <motion.div key="partner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12 text-center pt-8">
              {partnerSubView === 'menu' && (
                <div className="space-y-12">
                   <h1 className="text-4xl font-bold">Musaffa Partner</h1>
                   <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                    <button onClick={() => { setPartnerSubView('prompt'); startNewPrompt(); }} className="glass-card p-10 text-left space-y-2 hover:border-amber-400/50">
                      <div className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">Mode 01</div>
                      <h3 className="text-2xl font-bold">Prompt & Reveal</h3>
                      <p className="text-slate-500 text-sm">Listen to a verse and test your memory.</p>
                    </button>
                    <button onClick={() => setView('list')} className="glass-card p-10 text-left space-y-2 hover:border-emerald-400/50">
                      <div className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Mode 02</div>
                      <h3 className="text-2xl font-bold">Mudarasa Partner</h3>
                      <p className="text-slate-500 text-sm">Alternate recitation with the app.</p>
                    </button>
                    {stumbles.length > 0 && (
                      <button onClick={() => setPartnerSubView('stumbles')} className="glass-card p-10 text-left space-y-2 border-red-400/20 hover:border-red-400/50">
                        <div className="text-red-400 font-bold uppercase tracking-widest text-[10px]">Review Needed</div>
                        <h3 className="text-2xl font-bold">Stumble Log ({stumbles.length})</h3>
                        <p className="text-slate-500 text-sm">Review verses you struggled with.</p>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {partnerSubView === 'stumbles' && (
                <div className="space-y-12">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setPartnerSubView('menu')} className="p-2"><ChevronLeft size={24} /></button>
                    <h2 className="text-2xl font-bold">Stumble Log</h2>
                    <button onClick={() => setStumbles([])} className="text-xs text-red-400 font-bold uppercase tracking-widest">Clear All</button>
                  </div>
                  <div className="space-y-6">
                    {stumbles.map((s) => (
                      <div key={s.number} className="glass-card p-8 text-center space-y-4">
                        <div className="arabic-text text-3xl leading-relaxed">{s.text}</div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{s.surahName} • Ayah {s.numberInSurah}</p>
                        <button onClick={() => playAyahAudio(s.number)} className="p-2 text-amber-400"><Volume2 size={20} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {partnerSubView === 'prompt' && currentAyah && (
                <div className="max-w-xl mx-auto space-y-16 py-8">
                  <div className="space-y-4">
                    <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-bold">Challenge Active</p>
                    <h2 className="text-4xl font-bold">Complete the Verse</h2>
                  </div>
                  
                  <div className="py-20 flex flex-col items-center gap-12">
                    {isPlaying ? (
                      <div className="w-24 h-24 rounded-full border border-amber-400/20 flex items-center justify-center animate-pulse">
                        <Volume2 size={40} className="text-amber-400" />
                      </div>
                    ) : (
                      <button onClick={() => playAyahAudio(currentAyah.number)} className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-950 hover:scale-105 transition-transform"><RotateCcw size={32} /></button>
                    )}
                    
                    <AnimatePresence>
                      {isRevealed ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                           <div className="arabic-text text-4xl leading-relaxed text-amber-400 px-4">{currentAyah.text}</div>
                           <p className="text-slate-600 text-sm font-medium uppercase tracking-widest">{currentAyah.surahName} • {currentAyah.numberInSurah}</p>
                        </motion.div>
                      ) : (
                        <button onClick={() => setIsRevealed(true)} className="text-slate-500 hover:text-white uppercase tracking-widest text-xs font-bold py-4 px-8 border border-white/5 rounded-full">Reveal Verse</button>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={startNewPrompt} className="text-amber-400 font-bold py-4 px-12 border border-amber-400/20 rounded-2xl hover:bg-amber-400/5 transition-all">Next Challenge</button>
                </div>
              )}

              {partnerSubView === 'mudarasa' && currentAyah && (
                <div className="max-w-xl mx-auto space-y-16 py-8">
                  <div className="space-y-4">
                    <p className="text-emerald-400 uppercase tracking-[0.2em] text-[10px] font-bold">Mudarasa Session</p>
                    <h2 className="text-3xl font-bold">{currentAyah.surahName}</h2>
                  </div>

                  <div className={`p-12 rounded-[3rem] transition-all duration-700 ${mudarasaTurn === 'app' ? 'bg-emerald-400/5 border border-emerald-400/10' : 'bg-slate-900/30 border border-white/5'}`}>
                    {mudarasaTurn === 'app' ? (
                      <div className="space-y-10">
                        <div className="arabic-text text-4xl leading-relaxed">{currentAyah.text}</div>
                        <button onClick={nextMudarasaTurn} className="px-12 py-4 bg-emerald-400 text-slate-950 rounded-2xl font-bold uppercase tracking-widest text-xs">My Turn</button>
                      </div>
                    ) : (
                      <div className="space-y-10 py-12">
                        <div className="w-20 h-20 border border-emerald-400/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-pulse"><Users size={32} /></div>
                        <p className="text-xl font-medium">Recite Verse {mudarasaIndex + 2}</p>
                        <div className="flex justify-center gap-4">
                          <button onClick={() => logStumble(currentAyah)} className="px-8 py-3 border border-red-400/20 text-red-400 rounded-xl font-bold uppercase tracking-widest text-[10px]">I Stumbled</button>
                          <button onClick={nextMudarasaTurn} className="px-12 py-4 bg-white text-slate-950 rounded-2xl font-bold uppercase tracking-widest text-xs">Next Verse</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 px-12 flex items-center justify-center gap-16">
        <button onClick={() => setView('list')} className={`flex flex-col items-center gap-2 transition-all ${view === 'list' || view === 'detail' ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <Book size={20} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Reader</span>
        </button>
        <button onClick={() => { setView('partner'); setPartnerSubView('menu'); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'partner' ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <Users size={20} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Partner</span>
        </button>
      </nav>
    </div>
  )
}

export default App
