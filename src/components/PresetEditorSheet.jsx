import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, Mic, Hand } from 'lucide-react';

const PORTIONS = [
  { id: 'verse', label: 'Single Verse' },
  { id: 'third', label: '1/3 Page' },
  { id: 'half', label: '1/2 Page' },
  { id: 'page', label: 'Full Page' },
  { id: 'rubu', label: "Rub'u" },
  { id: 'hizb', label: 'Hizb' },
];

const PresetEditorSheet = ({ preset, presetIndex, surahs, onSave, onClose }) => {
  const [draft, setDraft] = useState({ ...preset });

  useEffect(() => { setDraft({ ...preset }); }, [preset]);

  const getAyahCount = (surahNum) => surahs.find(s => s.number === surahNum)?.numberOfAyahs || 1;
  const startAyahCount = getAyahCount(draft.startSurah);
  const endAyahCount = getAyahCount(draft.endSurah);

  const set = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  const selectStyle = {
    background: 'var(--bg-accent)', color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)', padding: '0.65rem 0.5rem',
    borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.8rem',
    flex: 1, minWidth: 0,
  };

  const labelStyle = {
    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block',
  };

  const modeActive = (autoNext, errorDetection) =>
    draft.autoNext === autoNext && draft.errorDetection === errorDetection;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }}
      />
      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: 'var(--bg-secondary)', borderRadius: '1.5rem 1.5rem 0 0',
          padding: '1.5rem 1rem 2.5rem', maxHeight: '90vh', overflowY: 'auto',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Handle & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
            Edit Preset {presetIndex + 1}
          </h2>
          <button onClick={onClose} className="icon-btn" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Label */}
          <div>
            <span style={labelStyle}>Preset Name</span>
            <input
              value={draft.label}
              onChange={e => set('label', e.target.value)}
              placeholder="e.g. Juz Amma"
              style={{
                ...selectStyle, width: '100%', padding: '0.75rem 1rem',
                background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          {/* Surah Range */}
          <div>
            <span style={labelStyle}>Start From</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select value={draft.startSurah} onChange={e => { set('startSurah', Number(e.target.value)); set('startAyah', 1); }} style={{ ...selectStyle, flex: '2' }}>
                {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
              </select>
              <select value={draft.startAyah} onChange={e => set('startAyah', Number(e.target.value))} style={selectStyle}>
                {Array.from({ length: startAyahCount }, (_, i) => i + 1).map(n => <option key={n} value={n}>Ayah {n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span style={labelStyle}>End At</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select value={draft.endSurah} onChange={e => { set('endSurah', Number(e.target.value)); set('endAyah', getAyahCount(Number(e.target.value))); }} style={{ ...selectStyle, flex: '2' }}>
                {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
              </select>
              <select value={draft.endAyah} onChange={e => set('endAyah', Number(e.target.value))} style={selectStyle}>
                {Array.from({ length: endAyahCount }, (_, i) => i + 1).map(n => <option key={n} value={n}>Ayah {n}</option>)}
              </select>
            </div>
          </div>

          {/* Portion */}
          <div>
            <span style={labelStyle}>Turn Portion</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PORTIONS.map(p => (
                <button key={p.id} onClick={() => set('portion', p.id)} style={{
                  padding: '0.45rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
                  border: '1px solid', fontSize: '0.72rem', fontWeight: '700',
                  borderColor: draft.portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: draft.portion === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                  color: draft.portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Session Mode */}
          <div>
            <span style={labelStyle}>Session Mode</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Manual Tap', desc: 'Advance turns manually', autoNext: false, errorDetection: false, icon: <Hand size={15} />, color: 'var(--accent-gold)' },
                { label: 'Hands-Free', desc: 'Auto-advance on silence', autoNext: true, errorDetection: false, icon: <Mic size={15} />, color: 'var(--accent-emerald)' },
                { label: 'Smart Detection', desc: 'Auto-advance + accuracy check', autoNext: true, errorDetection: true, icon: <BrainCircuit size={15} />, color: '#818cf8' },
              ].map(m => {
                const active = modeActive(m.autoNext, m.errorDetection);
                return (
                  <button key={m.label} onClick={() => { set('autoNext', m.autoNext); set('errorDetection', m.errorDetection); }} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `1px solid ${active ? m.color : 'var(--glass-border)'}`,
                    background: active ? `${m.color}18` : 'var(--bg-accent)', textAlign: 'left',
                  }}>
                    <span style={{ color: active ? m.color : 'var(--text-muted)' }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '800', fontSize: '0.8rem', color: active ? m.color : 'var(--text-primary)', margin: 0 }}>{m.label}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>{m.desc}</p>
                    </div>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: `2px solid ${active ? m.color : 'var(--glass-border)'}`,
                      background: active ? m.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Who Starts */}
          <div>
            <span style={labelStyle}>Who Reads First</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['app', 'user'].map(who => (
                <button key={who} onClick={() => set('whoStarts', who)} style={{
                  flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: '1px solid', fontWeight: '700', fontSize: '0.8rem',
                  borderColor: draft.whoStarts === who ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: draft.whoStarts === who ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                  color: draft.whoStarts === who ? 'var(--accent-gold)' : 'var(--text-secondary)',
                }}>
                  {who === 'app' ? '🔊 App' : '🎙️ Me'}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Save Button */}
        <button
          onClick={() => onSave(draft)}
          className="btn-primary"
          style={{ width: '100%', marginTop: '1.5rem', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}
        >
          Save Preset
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default PresetEditorSheet;
