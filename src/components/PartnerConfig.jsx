import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Layers, FileText, LayoutGrid, Mic, MicOff, Settings2, AlertCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view when opened
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem', fontWeight: '500',
          cursor: 'pointer', textAlign
        }}
      >
        <span>{selected ? selected.label : 'Select...'}</span>
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {open && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: '4px', padding: '0.25rem', margin: 0, listStyle: 'none',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            maxHeight: '200px', overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
          }}
          className="no-scrollbar config-fade-in"
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                data-active={opt.value === value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', textAlign: 'left',
                  background: opt.value === value ? 'var(--accent-gold-soft, rgba(251, 191, 36, 0.1))' : 'transparent',
                  color: opt.value === value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  border: 'none', borderRadius: '4px',
                  fontSize: '0.85rem', fontWeight: opt.value === value ? '700' : '400',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.background = opt.value === value ? 'var(--accent-gold-soft, rgba(251, 191, 36, 0.1))' : 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.target.style.background = opt.value === value ? 'var(--accent-gold-soft, rgba(251, 191, 36, 0.1))' : 'transparent'}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PartnerConfig = ({
  surahs,
  params,
  onChange,
  onStart,
  currentVolume,
  isListening
}) => {
  const navigate = useNavigate();
  
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

  // We add a simple global animation keyframe for the dropdown to avoid framer-motion compositing overhead
  useEffect(() => {
    if (!document.getElementById('dropdown-keyframes')) {
      const style = document.createElement('style');
      style.id = 'dropdown-keyframes';
      style.innerHTML = `
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .config-fade-in {
          animation: fadeInDown 0.15s ease-out forwards;
        }
        .page-fade-in {
          animation: fadeInDown 0.3s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="page-fade-in max-w-2xl mx-auto space-y-8 pt-4 pb-24 px-2">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/')} className="icon-btn" style={{ width: '36px', height: '36px' }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Musaffa Config</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Configure your Mudarasa session</p>
        </div>
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
              <div style={{ width: '40px', height: '20px', borderRadius: '10px', background: params.autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '0.2s ease' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: params.autoNext ? '#000' : 'var(--text-muted)', position: 'absolute', top: '2px', left: params.autoNext ? '22px' : '2px', transition: '0.2s ease' }} />
              </div>
            </button>

            {params.autoNext && (
              <div className="config-fade-in" style={{ background: 'var(--bg-accent)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings2 size={14} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mic Sensitivity</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    <span>Less Sensitive</span>
                    <span style={{marginLeft: 'auto'}}>Very Sensitive</span>
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
                    <div
                      style={{ height: '100%', background: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)', opacity: 0.5, width: `${(currentVolume / 100) * 100}%`, transition: '0.1s linear' }}
                    />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(params.micSensitivity / 100) * 100}%`, width: '2px', background: 'var(--accent-gold)', boxShadow: '0 0 10px var(--accent-gold-glow)' }} />
                  </div>
                </div>
              </div>
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
    </div>
  );
};

export default PartnerConfig;
