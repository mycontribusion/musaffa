import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, LayoutGrid, Layers, FileText, AlertCircle, Mic, MicOff, Settings2 } from 'lucide-react';

const PartnerSession = ({
  subView,
  surahs,
  musaffaParams,
  setMusaffaParams,
  startMusaffa,
  chunks,
  currentChunkIndex,
  mudarasaTurn,
  currentAyahNumber,
  handleNextTurnManual,
  logStumble,
  setPartnerSubView,
}) => {
  const { startSurah, startAyah, endSurah, endAyah, portion, whoStarts, autoNext, micSensitivity } = musaffaParams;
  const activeAyahRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);

  const handleParamChange = (key, value) => {
    setMusaffaParams(prev => ({ ...prev, [key]: value }));
  };

  // Auto-scroll logic
  useEffect(() => {
    if (activeAyahRef.current && mudarasaTurn === 'app') {
      activeAyahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentAyahNumber]);

  useEffect(() => {
    if (mudarasaTurn === 'user') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentChunkIndex, mudarasaTurn]);

  // Mic Monitoring Logic (Shared for Config and Mudarasa)
  useEffect(() => {
    let stream = null;
    let animationFrame = null;

    const startMicMonitoring = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silenceStart = null;
        const SILENCE_DURATION = 3500; // 3.5 seconds

        const checkVolume = () => {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setCurrentVolume(average);

          // Only trigger auto-next if in Mudarasa view and it's user's turn
          if (subView === 'mudarasa' && mudarasaTurn === 'user') {
            if (average < micSensitivity) {
              if (!silenceStart) silenceStart = Date.now();
              else if (Date.now() - silenceStart > SILENCE_DURATION) {
                handleNextTurnManual();
                silenceStart = null;
              }
            } else {
              silenceStart = null;
            }
          }

          animationFrame = requestAnimationFrame(checkVolume);
        };

        setIsListening(true);
        checkVolume();
      } catch (err) {
        setIsListening(false);
      }
    };

    if (autoNext && (subView === 'mudarasa' || subView === 'config')) {
      startMicMonitoring();
    } else {
      setIsListening(false);
      setCurrentVolume(0);
    }

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [subView, mudarasaTurn, autoNext, micSensitivity]);

  const getAyahCount = (surahNum) => {
    const surah = surahs.find(s => s.number === surahNum);
    return surah ? surah.numberOfAyahs : 7;
  };

  const startAyahCount = getAyahCount(startSurah);
  const endAyahCount = getAyahCount(endSurah);

  const isRangeValid = () => {
    if (startSurah < endSurah) return true;
    if (startSurah === endSurah && startAyah <= endAyah) return true;
    return false;
  };

  if (subView === 'config') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8 pt-4 pb-24 px-2">
        <div className="text-center space-y-3">
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Musaffa Session</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure your range and turn size.</p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          {/* Range Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="section-label">Start From</div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select value={startSurah} onChange={(e) => handleParamChange('startSurah', Number(e.target.value))} style={{ flex: '1.5', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}>
                  {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                </select>
                <select value={startAyah} onChange={(e) => handleParamChange('startAyah', Number(e.target.value))} style={{ flex: '1', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }}>
                  {Array.from({ length: startAyahCount }, (_, i) => i + 1).map(num => <option key={num} value={num}>Ayah {num}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="section-label">End At</div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select value={endSurah} onChange={(e) => handleParamChange('endSurah', Number(e.target.value))} style={{ flex: '1.5', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}>
                  {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                </select>
                <select value={endAyah} onChange={(e) => handleParamChange('endAyah', Number(e.target.value))} style={{ flex: '1', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }}>
                  {Array.from({ length: endAyahCount }, (_, i) => i + 1).map(num => <option key={num} value={num}>Ayah {num}</option>)}
                </select>
              </div>
            </div>
          </div>

          {!isRangeValid() && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}><AlertCircle size={14} /><span>Start must be earlier than End.</span></div>}

          {/* Portion Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section-label">Turn Portion</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {[
                { id: 'verse', label: 'Single Verse', icon: <FileText size={14} /> },
                { id: 'third', label: '1/3 Page', icon: <Layers size={14} /> },
                { id: 'half', label: '1/2 Page', icon: <Layers size={14} /> },
                { id: 'page', label: 'Full Page', icon: <Layers size={14} /> },
                { id: 'rubu', label: 'Rub\'u', icon: <LayoutGrid size={14} /> },
                { id: 'hizb', label: 'Hizb', icon: <LayoutGrid size={14} /> },
              ].map(p => (
                <button key={p.id} onClick={() => handleParamChange('portion', p.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)', background: portion === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)', color: portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', transition: 'var(--transition-fast)' }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hands-Free Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="section-label">Session Mode</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleParamChange('autoNext', !autoNext)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius-lg)', background: autoNext ? 'var(--accent-gold-soft)' : 'var(--bg-accent)', border: '1px solid', borderColor: autoNext ? 'var(--accent-gold)' : 'var(--glass-border)', transition: 'var(--transition-fast)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: autoNext ? '#000' : 'var(--text-muted)' }}>
                    {autoNext ? <Mic size={18} /> : <MicOff size={18} />}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '800', fontSize: '0.8rem', color: autoNext ? 'var(--accent-gold)' : 'var(--text-primary)' }}>Hands-Free Mode</p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Auto-switch turns using microphone.</p>
                  </div>
                </div>
                <div style={{ width: '40px', height: '20px', borderRadius: '10px', background: autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <motion.div animate={{ x: autoNext ? 22 : 2 }} style={{ width: '16px', height: '16px', borderRadius: '50%', background: autoNext ? '#000' : 'var(--text-muted)', position: 'absolute', top: '2px' }} />
                </div>
              </button>

              {autoNext && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'var(--bg-accent)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings2 size={14} style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mic Sensitivity</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                      <span>Less Sensitive (Loud Voice)</span>
                      <span>Very Sensitive (Whisper)</span>
                    </div>
                    <input
                      type="range"
                      min="5" max="80"
                      value={90 - micSensitivity} // Reverse so slider feels natural (more to the right = more sensitive)
                      onChange={(e) => handleParamChange('micSensitivity', 90 - Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-gold)', height: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-muted)' }}>LIVE LEVEL METER</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: currentVolume > micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                        {currentVolume > micSensitivity ? "SPEECH DETECTED" : "SILENCE"}
                      </span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <motion.div
                        style={{ height: '100%', background: currentVolume > micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)', opacity: 0.5 }}
                        animate={{ width: `${(currentVolume / 100) * 100}%` }}
                      />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(micSensitivity / 100) * 100}%`, width: '2px', background: 'var(--accent-gold)', boxShadow: '0 0 10px var(--accent-gold-glow)' }} />
                    </div>
                    <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      Tip: Adjust the slider so your normal recitation goes PAST the gold line, but background noise stays BEFORE it.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section-label">Who Starts?</div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => handleParamChange('whoStarts', 'app')} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--glass-border)', background: whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', color: whoStarts === 'app' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>App Starts</button>
              <button onClick={() => handleParamChange('whoStarts', 'user')} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--glass-border)', background: whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)', color: whoStarts === 'user' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>I Start</button>
            </div>
          </div>

          <button onClick={startMusaffa} disabled={!isRangeValid()} className="btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '0.9rem', marginTop: '0.5rem', opacity: isRangeValid() ? 1 : 0.3, cursor: isRangeValid() ? 'pointer' : 'not-allowed' }}>Start Musaffa Session</button>
        </div>
      </motion.div>
    );
  }

  if (subView === 'mudarasa' && chunks[currentChunkIndex]) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 text-center pt-4 max-w-3xl mx-auto pb-40 px-2">
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', position: 'sticky', top: '1rem', zIndex: 100 }}>
          <button onClick={() => setPartnerSubView('config')} className="icon-btn"><ChevronLeft size={18} /></button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isListening && mudarasaTurn === 'user' ? (
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentVolume > micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)', boxShadow: currentVolume > micSensitivity ? '0 0 10px var(--accent-emerald-glow)' : 'none' }} />
              ) : (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)' }} />
              )}
              <span style={{ fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                {mudarasaTurn === 'app' ? "App Reciting" : "Your Turn"}
              </span>
            </div>
            <div style={{ width: '80px', height: '3px', background: 'var(--bg-accent)', borderRadius: '99px', overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', background: 'var(--accent-gold)' }} animate={{ width: `${((currentChunkIndex + 1) / chunks.length) * 100}%` }} />
            </div>
          </div>

          <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-accent)', padding: '0.3rem 0.6rem', borderRadius: '0.4rem' }}>
            {currentChunkIndex + 1}/{chunks.length}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '3rem 1rem', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="arabic-text" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '2', textAlign: 'center', direction: 'rtl' }}>
              {/* Unnumbered Bismillah for Musaffa */}
              {chunks[currentChunkIndex][0].numberInSurah === 1 && startSurah !== 1 && startSurah !== 9 && (
                <div style={{ marginBottom: '2rem', fontSize: '1.5rem', color: 'var(--accent-gold)', opacity: 0.6 }}>
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

              {chunks[currentChunkIndex].map((ayah) => {
                let displayText = ayah.text;
                // Clean Bismillah from Ayah 1
                if (ayah.numberInSurah === 1 && startSurah !== 1 && startSurah !== 9) {
                  const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
                  if (displayText.includes(BISMILLAH)) {
                    displayText = displayText.split(BISMILLAH).pop().trim();
                  } else if (displayText.startsWith("\ufeff")) {
                    displayText = displayText.replace(/^\ufeff/, "").trim();
                    if (displayText.includes(BISMILLAH)) {
                      displayText = displayText.split(BISMILLAH).pop().trim();
                    }
                  }
                }

                return (
                  <span key={ayah.number} ref={currentAyahNumber === ayah.number ? activeAyahRef : null} style={{ transition: 'var(--transition-smooth)', color: currentAyahNumber === ayah.number ? 'var(--accent-gold)' : mudarasaTurn === 'app' ? 'var(--text-muted)' : 'var(--text-primary)', opacity: currentAyahNumber === ayah.number ? 1 : 0.2 }}>
                    {displayText} <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid currentColor', fontSize: '9px', margin: '0 0.4rem', opacity: 0.2 }}>{ayah.numberInSurah}</span>
                  </span>
                );
              })}
            </div>

            <AnimatePresence>
              {mudarasaTurn === 'user' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', paddingTop: '1.5rem' }}>
                  <button onClick={handleNextTurnManual} className="btn-primary" style={{ width: '100%', maxWidth: '250px', padding: '1.25rem', borderRadius: '1.5rem', fontSize: '1.1rem', position: 'relative' }}>
                    I am Done
                    {isListening && (
                      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', inset: '-4px', borderRadius: '1.6rem', border: '2px solid var(--accent-emerald)' }} />
                    )}
                  </button>
                  <button onClick={() => logStumble(chunks[currentChunkIndex][0])} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Log Stumble</button>

                  {isListening && (
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                      <Mic size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      HANDS-FREE ACTIVE: TURN WILL SWITCH AUTOMATICALLY AFTER SILENCE
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default PartnerSession;
