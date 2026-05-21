import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Layers, FileText, LayoutGrid, Mic, MicOff, Settings2, AlertCircle } from 'lucide-react';

// Custom dropdown to replace native <select> — avoids Chrome's backdrop-filter compositing bug
const CustomSelect = ({ value, options, onChange, flex = '1', textAlign = 'left' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, []);

  // Scroll to selected option when opened
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) setTimeout(() => activeEl.scrollIntoView({ block: 'nearest' }), 50);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ flex, minWidth: 0, position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem',
          background: 'var(--bg-accent)', color: 'var(--text-primary)',
          border: '1px solid var(--glass-border)',
          padding: '0.8rem', borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
          outline: 'none', textAlign, whiteSpace: 'nowrap', overflow: 'hidden',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected?.label ?? '—'}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s ease' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
              background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)', listStyle: 'none', margin: 0, padding: '0.25rem',
              maxHeight: '220px', overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {options.map(opt => (
              <li
                key={opt.value}
                data-active={opt.value === value ? 'true' : 'false'}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem',
                  fontWeight: opt.value === value ? '700' : '500',
                  color: opt.value === value ? 'var(--accent-gold)' : 'var(--text-primary)',
                  background: opt.value === value ? 'var(--accent-gold-soft, rgba(251,191,36,0.1))' : 'transparent',
                  cursor: 'pointer', transition: '0.15s ease',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-accent)'; }}
                onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

const PartnerConfig = ({
  surahs,
  params,
  onChange,
  onStart,
  onBack,
  currentVolume,
  isListening
}) => {
  const getAyahCount = (surahNum) => {
    const s = surahs.find(x => x.number === surahNum);
    return s ? s.numberOfAyahs : 0;
  };

  const startAyahCount = getAyahCount(params.startSurah);
  const endAyahCount = getAyahCount(params.endSurah);

  const surahOptions = surahs.map(s => ({ value: s.number, label: `${s.number}. ${s.englishName}` }));
  const startAyahOptions = Array.from({ length: startAyahCount }, (_, i) => ({ value: i + 1, label: `Ayah ${i + 1}` }));
  const endAyahOptions = Array.from({ length: endAyahCount }, (_, i) => ({ value: i + 1, label: `Ayah ${i + 1}` }));

  const isRangeValid = () => {
    if (params.startSurah < params.endSurah) return true;
    if (params.startSurah === params.endSurah && params.startAyah <= params.endAyah) return true;
    return false;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8 pt-4 pb-24 px-2">
      <div className="text-center space-y-3">
        <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Musaffa Session</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure your range and turn size.</p>
      </div>

      <div className="solid-card" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '100%' }}>
        {/* Range Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="section-label">Start From</div>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <CustomSelect
                value={params.startSurah}
                options={surahOptions}
                onChange={(v) => onChange('startSurah', v)}
                flex="1.5"
              />
              <CustomSelect
                value={params.startAyah}
                options={startAyahOptions}
                onChange={(v) => onChange('startAyah', v)}
                flex="1"
                textAlign="center"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="section-label">End At</div>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <CustomSelect
                value={params.endSurah}
                options={surahOptions}
                onChange={(v) => onChange('endSurah', v)}
                flex="1.5"
              />
              <CustomSelect
                value={params.endAyah}
                options={endAyahOptions}
                onChange={(v) => onChange('endAyah', v)}
                flex="1"
                textAlign="center"
              />
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
              { id: 'rubu', label: "Rub'u", icon: <LayoutGrid size={14} /> },
              { id: 'hizb', label: 'Hizb', icon: <LayoutGrid size={14} /> },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => onChange('portion', p.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid', borderColor: params.portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: params.portion === p.id ? 'var(--accent-gold-soft, rgba(251,191,36,0.1))' : 'var(--bg-accent)',
                  color: params.portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', transition: 'var(--transition-fast)'
                }}
              >
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
              onClick={() => onChange('autoNext', !params.autoNext)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius-lg)', background: params.autoNext ? 'var(--accent-gold-soft, rgba(251,191,36,0.1))' : 'var(--bg-accent)', border: '1px solid', borderColor: params.autoNext ? 'var(--accent-gold)' : 'var(--glass-border)', transition: 'var(--transition-fast)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: params.autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: params.autoNext ? '#000' : 'var(--text-muted)' }}>
                  {params.autoNext ? <Mic size={18} /> : <MicOff size={18} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: '800', fontSize: '0.8rem', color: params.autoNext ? 'var(--accent-gold)' : 'var(--text-primary)' }}>Hands-Free Mode</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Auto-switch turns using microphone.</p>
                </div>
              </div>
              <div style={{ width: '40px', height: '20px', borderRadius: '10px', background: params.autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                <motion.div animate={{ x: params.autoNext ? 22 : 2 }} style={{ width: '16px', height: '16px', borderRadius: '50%', background: params.autoNext ? '#000' : 'var(--text-muted)', position: 'absolute', top: '2px' }} />
              </div>
            </button>

            {params.autoNext && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'var(--bg-accent)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings2 size={14} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mic Sensitivity</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    <span>Less Sensitive</span>
                    <span>Very Sensitive</span>
                  </div>
                  <input
                    type="range"
                    min="5" max="80"
                    value={90 - params.micSensitivity}
                    onChange={(e) => onChange('micSensitivity', 90 - Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-gold)', height: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-muted)' }}>LIVE LEVEL METER</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {currentVolume > params.micSensitivity ? "SPEECH DETECTED" : "SILENCE"}
                    </span>
                  </div>
                  <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                      style={{ height: '100%', background: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)', opacity: 0.5 }}
                      animate={{ width: `${(currentVolume / 100) * 100}%` }}
                    />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(params.micSensitivity / 100) * 100}%`, width: '2px', background: 'var(--accent-gold)', boxShadow: '0 0 10px var(--accent-gold-glow)' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Who Starts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="section-label">Who Starts?</div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => onChange('whoStarts', 'app')} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--glass-border)', background: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', color: params.whoStarts === 'app' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>App Starts</button>
            <button onClick={() => onChange('whoStarts', 'user')} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid', borderColor: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--glass-border)', background: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)', color: params.whoStarts === 'user' ? '#000' : 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>I Start</button>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={!isRangeValid()}
          className="btn-primary"
          style={{ width: '100%', padding: '1.25rem', fontSize: '0.9rem', marginTop: '0.5rem', opacity: isRangeValid() ? 1 : 0.3, cursor: isRangeValid() ? 'pointer' : 'not-allowed' }}
        >
          Start Musaffa Session
        </button>
      </div>
    </motion.div>
  );
};

export default PartnerConfig;
