import { motion } from 'framer-motion';
import { Layers, FileText, LayoutGrid, Mic, MicOff, Settings2, AlertCircle, Download, CheckCircle, Loader, BrainCircuit } from 'lucide-react';
import { RECITERS } from '../utils/quranUtils';

const PartnerConfig = ({
  surahs, params, onChange, onStart,
  currentVolume, reciter, setReciter,
  audioDownloadControls, sttSupported
}) => {
  const getAyahCount = (n) => (surahs.find(x => x.number === n)?.numberOfAyahs || 0);
  const startAyahCount = getAyahCount(params.startSurah);
  const endAyahCount   = getAyahCount(params.endSurah);
  const isRangeValid   = () =>
    params.startSurah < params.endSurah ||
    (params.startSurah === params.endSurah && params.startAyah <= params.endAyah);

  const PORTIONS = [
    { id: 'verse', label: 'Single Verse', icon: <FileText  size={13} /> },
    { id: 'third', label: '1/3 Page',    icon: <Layers    size={13} /> },
    { id: 'half',  label: '1/2 Page',    icon: <Layers    size={13} /> },
    { id: 'page',  label: 'Full Page',   icon: <Layers    size={13} /> },
    { id: 'rubu',  label: "Rub'u",       icon: <LayoutGrid size={13} /> },
    { id: 'hizb',  label: 'Hizb',        icon: <LayoutGrid size={13} /> },
  ];

  const sectionLabel = {
    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
  };

  const selectStyle = {
    background: 'var(--bg-accent)', color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)', padding: '0.75rem 0.5rem',
    borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem',
    minWidth: 0,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '640px', margin: '0 auto', padding: '0.5rem 0.5rem 6rem' }}>

      <div className="text-center" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900',
          color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Musaffa Session
        </h2>
      </div>

      <div className="glass-card" style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── Range — Start & End stacked ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={sectionLabel}>Start From</div>
            <div style={{ display: 'flex', gap: '0.4rem', overflow: 'hidden' }}>
              <select value={params.startSurah} onChange={e => onChange('startSurah', Number(e.target.value))}
                style={{ ...selectStyle, flex: '1.8' }}>
                {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
              </select>
              <select value={params.startAyah} onChange={e => onChange('startAyah', Number(e.target.value))}
                style={{ ...selectStyle, flex: '1', textAlign: 'center' }}>
                {Array.from({ length: startAyahCount }, (_, i) => i + 1).map(n =>
                  <option key={n} value={n}>Ayah {n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={sectionLabel}>End At</div>
            <div style={{ display: 'flex', gap: '0.4rem', overflow: 'hidden' }}>
              <select value={params.endSurah} onChange={e => onChange('endSurah', Number(e.target.value))}
                style={{ ...selectStyle, flex: '1.8' }}>
                {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
              </select>
              <select value={params.endAyah} onChange={e => onChange('endAyah', Number(e.target.value))}
                style={{ ...selectStyle, flex: '1', textAlign: 'center' }}>
                {Array.from({ length: endAyahCount }, (_, i) => i + 1).map(n =>
                  <option key={n} value={n}>Ayah {n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {!isRangeValid() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)',
            fontSize: '0.75rem', fontWeight: '700', background: 'rgba(239,68,68,0.1)',
            padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={13} /><span>Start must be earlier than End.</span>
          </div>
        )}

        {/* ── Turn Portion — horizontal scroll ── */}
        <div>
          <div style={sectionLabel}>Turn Portion</div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px',
            scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {PORTIONS.map(p => (
              <button key={p.id} onClick={() => onChange('portion', p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
                  padding: '0.55rem 1rem', borderRadius: '999px', whiteSpace: 'nowrap',
                  border: '1px solid', cursor: 'pointer',
                  borderColor: params.portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: params.portion === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                  color: params.portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontWeight: '700',
                }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Reciter — horizontal scroll ── */}
        <div>
          <div style={sectionLabel}>Reciter</div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px',
            scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {RECITERS.map(r => (
              <button key={r.id} onClick={() => setReciter(r.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0,
                  padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: '1px solid',
                  borderColor: reciter === r.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: reciter === r.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap',
                  color: reciter === r.id ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{r.name}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.style}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Session Mode ── */}
        <div>
          <div style={sectionLabel}>Session Mode</div>
          <button onClick={() => onChange('autoNext', !params.autoNext)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.9rem 1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              background: params.autoNext ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
              border: '1px solid', borderColor: params.autoNext ? 'var(--accent-gold)' : 'var(--glass-border)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: params.autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                color: params.autoNext ? '#000' : 'var(--text-muted)' }}>
                {params.autoNext ? <Mic size={16} /> : <MicOff size={16} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: '800', fontSize: '0.8rem', color: params.autoNext ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                  Hands-Free Mode
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Auto-switch turns using microphone.</p>
              </div>
            </div>
            <div style={{ width: '38px', height: '20px', borderRadius: '10px', flexShrink: 0,
              background: params.autoNext ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
              <motion.div animate={{ x: params.autoNext ? 20 : 2 }}
                style={{ width: '16px', height: '16px', borderRadius: '50%', position: 'absolute', top: '2px',
                  background: params.autoNext ? '#000' : 'var(--text-muted)' }} />
            </div>
          </button>

          {params.autoNext && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: '0.5rem', background: 'var(--bg-accent)', padding: '1rem',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Settings2 size={12} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mic Sensitivity</span>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '700',
                  color: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {currentVolume > params.micSensitivity ? '● SPEECH' : '○ SILENCE'}
                </span>
              </div>
              <input type="range" min="5" max="40"
                value={45 - params.micSensitivity}
                onChange={e => onChange('micSensitivity', 45 - Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-gold)', height: '4px' }} />
              <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                <motion.div style={{ height: '100%', opacity: 0.6,
                  background: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                  animate={{ width: `${(currentVolume / 100) * 100}%` }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0,
                  left: `${(params.micSensitivity / 40) * 100}%`, width: '2px', background: 'var(--accent-gold)' }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Smart Error Detection ── */}
        {sttSupported && (
          <div>
            <div style={sectionLabel}>Error Detection</div>
            <button onClick={() => onChange('errorDetection', !params.errorDetection)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.9rem 1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                background: params.errorDetection ? 'rgba(99,102,241,0.1)' : 'var(--bg-accent)',
                border: '1px solid', borderColor: params.errorDetection ? 'rgba(99,102,241,0.5)' : 'var(--glass-border)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: params.errorDetection ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  color: params.errorDetection ? '#818cf8' : 'var(--text-muted)' }}>
                  <BrainCircuit size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: '800', fontSize: '0.8rem', color: params.errorDetection ? '#818cf8' : 'var(--text-primary)' }}>
                    Smart Error Detection
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Listens and checks recitation accuracy after each turn.</p>
                </div>
              </div>
              <div style={{ width: '38px', height: '20px', borderRadius: '10px', flexShrink: 0,
                background: params.errorDetection ? '#6366f1' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                <motion.div animate={{ x: params.errorDetection ? 20 : 2 }}
                  style={{ width: '16px', height: '16px', borderRadius: '50%', position: 'absolute', top: '2px',
                    background: params.errorDetection ? '#fff' : 'var(--text-muted)' }} />
              </div>
            </button>
            {params.errorDetection && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)',
                  background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                  fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                🎙 Microphone will be used to capture your recitation. A word-by-word accuracy card will appear after each of your turns.
              </motion.div>
            )}
          </div>
        )}

        <div>
          <div style={sectionLabel}>Who Starts?</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => onChange('whoStarts', 'app')}
              style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-lg)', border: '1px solid', cursor: 'pointer',
                borderColor: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--glass-border)',
                background: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)',
                color: params.whoStarts === 'app' ? '#000' : 'var(--text-secondary)',
                fontWeight: '800', fontSize: '0.75rem' }}>App Starts</button>
            <button onClick={() => onChange('whoStarts', 'user')}
              style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-lg)', border: '1px solid', cursor: 'pointer',
                borderColor: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--glass-border)',
                background: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)',
                color: params.whoStarts === 'user' ? '#000' : 'var(--text-secondary)',
                fontWeight: '800', fontSize: '0.75rem' }}>I Start</button>
          </div>
        </div>

        {/* ── Start Button ── */}
        <button onClick={onStart} disabled={!isRangeValid()} className="btn-primary"
          style={{ width: '100%', padding: '1.1rem', fontSize: '0.9rem',
            opacity: isRangeValid() ? 1 : 0.3, cursor: isRangeValid() ? 'pointer' : 'not-allowed' }}>
          Start Musaffa Session
        </button>

      </div>
    </motion.div>
  );
};

export default PartnerConfig;
