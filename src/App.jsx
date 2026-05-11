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
  const [partnerSubView, setPartnerSubView] = useState('menu') // 'menu', 'prompt', 'mudarasa'
  const [currentAyah, setCurrentAyah] = useState(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(new Audio())

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

  // --- Feature 1: Prompt & Reveal ---
  const startNewPrompt = () => {
    if (!quranAr) return
    const allAyahs = quranAr.surahs.flatMap(s => s.ayahs.map(a => ({...a, surahName: s.englishName, surahNumber: s.number})))
    const randomAyah = allAyahs[Math.floor(Math.random() * allAyahs.length)]
    setCurrentAyah(randomAyah)
    setIsRevealed(false)
    playAyahAudio(randomAyah.number)
  }

  // --- Feature 2: Mudarasa (Alternating) ---
  const [mudarasaSurah, setMudarasaSurah] = useState(1)
  const [mudarasaIndex, setMudarasaIndex] = useState(0)
  const [mudarasaTurn, setMudarasaTurn] = useState('app') // 'app' or 'user'

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
    } else {
      const nextIdx = mudarasaIndex + 1
      if (nextIdx < quranAr.surahs[mudarasaSurah - 1].ayahs.length) {
        setMudarasaIndex(nextIdx)
        playMudarasaAyah(mudarasaSurah, nextIdx)
      } else {
        alert("Surah completed!")
        setPartnerSubView('menu')
      }
    }
  }

  const filteredSurahs = surahs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString() === searchQuery
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 py-6 mb-8 backdrop-blur-lg border-b border-white/5">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('list')}>
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
              <Book className="text-slate-950" size={24} />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Quran Partner</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/5 text-slate-400">
              <Moon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Search Surah..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/5 rounded-2xl focus:outline-none focus:border-amber-400/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSurahs.map((surah) => (
                  <div key={surah.number} onClick={() => { setSelectedSurah(surah); setView('detail'); window.scrollTo(0, 0); }} className="glass-card p-6 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 font-bold">{surah.number}</div>
                      <div>
                        <h3 className="text-lg font-semibold">{surah.englishName}</h3>
                        <p className="text-sm text-slate-400">{surah.englishNameTranslation}</p>
                      </div>
                    </div>
                    <div className="arabic text-xl font-bold text-amber-400">{surah.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedSurah && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex items-center justify-between mb-12">
                <button onClick={() => setView('list')} className="p-3 rounded-xl bg-slate-900/50 border border-white/5"><ChevronLeft size={24} /></button>
                <div className="text-center">
                  <h2 className="text-3xl font-bold">{selectedSurah.englishName}</h2>
                  <p className="text-slate-400">{selectedSurah.revelationType} • {selectedSurah.numberOfAyahs} Ayahs</p>
                </div>
                <button onClick={() => startMudarasa(selectedSurah.number)} className="p-3 rounded-xl bg-amber-400 text-slate-950 flex items-center gap-2 font-bold">
                  <Users size={20} /> Partner
                </button>
              </div>
              <div className="space-y-12">
                {quranAr.surahs[selectedSurah.number - 1].ayahs.map((ayah, idx) => (
                  <div key={ayah.number} className="pb-12 border-b border-white/5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">{selectedSurah.number}:{idx+1}</span>
                      <button onClick={() => playAyahAudio(ayah.number)} className="p-2 rounded-lg bg-slate-900 border border-white/5"><Play size={16} /></button>
                    </div>
                    <div className="arabic-text text-3xl md:text-4xl text-right leading-relaxed">{ayah.text}</div>
                    <div className="text-slate-400 text-lg">{quranEn.surahs[selectedSurah.number - 1].ayahs[idx].text}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'partner' && (
            <motion.div key="partner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {partnerSubView === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-12">
                  <div onClick={() => { setPartnerSubView('prompt'); startNewPrompt(); }} className="glass-card p-8 cursor-pointer text-center space-y-4 hover:border-amber-400/50">
                    <div className="w-16 h-16 bg-amber-400/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto"><Volume2 size={32} /></div>
                    <h3 className="text-2xl font-bold">Prompt & Reveal</h3>
                    <p className="text-slate-400">The app plays a random verse. Can you finish it?</p>
                  </div>
                  <div onClick={() => setView('list')} className="glass-card p-8 cursor-pointer text-center space-y-4 hover:border-emerald-400/50">
                    <div className="w-16 h-16 bg-emerald-400/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto"><Users size={32} /></div>
                    <h3 className="text-2xl font-bold">Mudarasa Partner</h3>
                    <p className="text-slate-400">Choose a Surah and alternate recitation with the app.</p>
                  </div>
                </div>
              )}

              {partnerSubView === 'prompt' && currentAyah && (
                <div className="max-w-2xl mx-auto space-y-12 py-12 text-center">
                  <div className="space-y-4">
                    <h2 className="text-amber-400 font-bold uppercase tracking-widest text-sm">Challenge</h2>
                    <p className="text-3xl font-bold">Listen and Recite</p>
                  </div>
                  
                  <div className="glass-card p-12 min-h-[300px] flex flex-col items-center justify-center gap-8 border-dashed">
                    {isPlaying ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-amber-400"><Volume2 size={64} /></motion.div>
                    ) : (
                      <button onClick={() => playAyahAudio(currentAyah.number)} className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center text-slate-950 shadow-xl shadow-amber-400/20"><RotateCcw size={32} /></button>
                    )}
                    
                    <AnimatePresence>
                      {isRevealed ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                           <div className="arabic-text text-4xl leading-relaxed text-amber-400">{currentAyah.text}</div>
                           <p className="text-slate-500">{currentAyah.surahName} • Ayah {currentAyah.numberInSurah}</p>
                        </motion.div>
                      ) : (
                        <button onClick={() => setIsRevealed(true)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                          <Eye size={20} /> Reveal Verse
                        </button>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button onClick={startNewPrompt} className="px-8 py-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-800">
                      <SkipForward size={20} /> Next Challenge
                    </button>
                  </div>
                </div>
              )}

              {partnerSubView === 'mudarasa' && currentAyah && (
                <div className="max-w-2xl mx-auto space-y-12 py-12 text-center">
                  <div className="space-y-2">
                    <h2 className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Mudarasa</h2>
                    <p className="text-2xl font-bold">{currentAyah.surahName} • {mudarasaIndex + 1}</p>
                  </div>

                  <div className={`glass-card p-12 transition-all duration-500 ${mudarasaTurn === 'app' ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-white/5'}`}>
                    {mudarasaTurn === 'app' ? (
                      <div className="space-y-8">
                        <p className="text-slate-400">App is Reciting...</p>
                        <div className="arabic-text text-4xl leading-relaxed">{currentAyah.text}</div>
                        <button onClick={nextMudarasaTurn} className="px-8 py-3 bg-emerald-400 text-slate-950 rounded-xl font-bold">I'm Ready (My Turn)</button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-400/30 animate-pulse"><Users size={32} /></div>
                        <p className="text-xl font-bold">Your Turn to Recite Verse {mudarasaIndex + 2}</p>
                        <p className="text-slate-400">Recite the next verse, then click below for the App's turn.</p>
                        <button onClick={nextMudarasaTurn} className="px-8 py-3 bg-white text-slate-950 rounded-xl font-bold">Done (App's Turn)</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-center gap-12">
        <button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'list' || view === 'detail' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Book size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Reader</span>
        </button>
        <button onClick={() => { setView('partner'); setPartnerSubView('menu'); }} className={`flex flex-col items-center gap-1 transition-colors ${view === 'partner' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Users size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Partner</span>
        </button>
      </nav>
    </div>
  )
}

export default App
