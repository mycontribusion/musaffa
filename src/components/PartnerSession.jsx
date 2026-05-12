import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, LayoutGrid, Layers, FileText } from 'lucide-react';

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
  const { startSurah, startAyah, endSurah, endAyah, portion, whoStarts } = musaffaParams;

  const handleParamChange = (key, value) => {
    setMusaffaParams(prev => ({ ...prev, [key]: value }));
  };

  if (subView === 'config') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8 pt-4 pb-24 px-2">
        <div className="text-center space-y-3">
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Musaffa Session</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure your range and turn size.</p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          {/* Range Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Start From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="section-label">Start From</div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select 
                  value={startSurah} 
                  onChange={(e) => handleParamChange('startSurah', Number(e.target.value))}
                  style={{ flex: '1.5', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                >
                  {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                </select>
                <input 
                  type="number" 
                  value={startAyah} 
                  onChange={(e) => handleParamChange('startAyah', Number(e.target.value))}
                  placeholder="Ayah"
                  style={{ flex: '1', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* End At */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="section-label">End At</div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select 
                  value={endSurah} 
                  onChange={(e) => handleParamChange('endSurah', Number(e.target.value))}
                  style={{ flex: '1.5', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                >
                  {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                </select>
                <input 
                  type="number" 
                  value={endAyah} 
                  onChange={(e) => handleParamChange('endAyah', Number(e.target.value))}
                  placeholder="Ayah"
                  style={{ flex: '1', minWidth: '0', background: 'var(--bg-accent)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: 'var(--radius-md)', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Portion Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section-label">Turn Portion</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {[
                { id: 'verse', label: 'Single Verse', icon: <FileText size={14} /> },
                { id: 'third', label: '1/3 Page', icon: <Layers size={14} /> },
                { id: 'half', label: '1/2 Page', icon: <Layers size={14} /> },
                { id: 'page', label: 'Full Page', icon: <Layers size={14} /> },
                { id: 'rubu', label: 'Rub\'u', icon: <LayoutGrid size={14} /> },
                { id: 'hizb', label: 'Hizb', icon: <LayoutGrid size={14} /> },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handleParamChange('portion', p.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    padding: '0.8rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid',
                    borderColor: portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                    background: portion === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                    color: portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Who Starts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section-label">Who Starts?</div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => handleParamChange('whoStarts', 'app')} 
                style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--glass-border)', background: whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', color: whoStarts === 'app' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                App Starts
              </button>
              <button 
                onClick={() => handleParamChange('whoStarts', 'user')} 
                style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--glass-border)', background: whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)', color: whoStarts === 'user' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                I Start
              </button>
            </div>
          </div>

          <button 
            onClick={startMusaffa} 
            className="btn-primary"
            style={{ width: '100%', padding: '1.25rem', fontSize: '0.9rem', marginTop: '1rem' }}
          >
            Start Musaffa Session
          </button>
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
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)' }} />
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
              {chunks[currentChunkIndex].map((ayah) => (
                <span 
                  key={ayah.number} 
                  style={{ 
                    transition: 'var(--transition-smooth)',
                    color: currentAyahNumber === ayah.number ? 'var(--accent-gold)' : mudarasaTurn === 'app' ? 'rgba(255,255,255,0.1)' : 'var(--text-primary)'
                  }}
                >
                  {ayah.text} 
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid currentColor', fontSize: '9px', margin: '0 0.4rem', opacity: 0.2 }}>{ayah.numberInSurah}</span>
                </span>
              ))}
            </div>

            {mudarasaTurn === 'user' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', paddingTop: '1.5rem' }}>
                  <button 
                    onClick={handleNextTurnManual} 
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: '250px', padding: '1.25rem', borderRadius: '1.5rem', fontSize: '1.1rem' }}
                  >
                    I am Done
                  </button>
                  <button 
                    onClick={() => logStumble(chunks[currentChunkIndex][0])} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                  >
                    Log Stumble
                  </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default PartnerSession;
