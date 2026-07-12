import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, FileText, LayoutGrid, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { RECITERS } from '../../utils/quranUtils';

const PORTIONS = [
  { id: 'verse', label: 'Single Verse', icon: <FileText size={13} /> },
  { id: 'third', label: '1/3 Page', icon: <Layers size={13} /> },
  { id: 'half', label: '1/2 Page', icon: <Layers size={13} /> },
  { id: 'page', label: 'Full Page', icon: <Layers size={13} /> },
  { id: 'rubu', label: "Rub'u", icon: <LayoutGrid size={13} /> },
  { id: 'hizb', label: 'Hizb', icon: <LayoutGrid size={13} /> },
];

const sectionLabel = {
  fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
};

/**
 * AdvancedSettingsPanel — collapsible section for Portion, Reciter, Who Starts,
 * Mic Sensitivity (Hands-Free), and Accuracy Threshold (Smart Detection).
 */
export const AdvancedSettingsPanel = ({
  showAdvanced,
  setShowAdvanced,
  params,
  onChange,
  reciter,
  setReciter,
  currentVolume,
}) => {
  const portionRef = useRef(null);
  const reciterRef = useRef(null);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          padding: '0.6rem 0.9rem', width: '100%',
          background: showAdvanced ? 'var(--bg-accent)' : 'transparent',
          border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <Settings2 size={15} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', lineHeight: 1.2 }}>
              {showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings'}
            </div>
            {!showAdvanced && (
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Portion · Reciter · Who Starts · Mic Sensitivity
              </div>
            )}
          </div>
        </div>
        {showAdvanced ? <ChevronUp size={15} style={{ flexShrink: 0 }} /> : <ChevronDown size={15} style={{ flexShrink: 0 }} />}
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>

              {/* Turn Portion */}
              <div>
                <div style={sectionLabel}>Turn Portion</div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {PORTIONS.map(p => (
                    <button
                      key={p.id}
                      ref={params.portion === p.id ? portionRef : null}
                      onClick={() => onChange('portion', p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
                        padding: '0.55rem 1rem', borderRadius: '999px', whiteSpace: 'nowrap',
                        border: '1px solid', cursor: 'pointer',
                        borderColor: params.portion === p.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                        background: params.portion === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                        color: params.portion === p.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontSize: '0.75rem', fontWeight: '700',
                      }}
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reciter */}
              <div>
                <div style={sectionLabel}>Reciter</div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {RECITERS.map(r => (
                    <button
                      key={r.id}
                      ref={reciter === r.id ? reciterRef : null}
                      onClick={() => setReciter(r.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0,
                        padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: '1px solid',
                        borderColor: reciter === r.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                        background: reciter === r.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap', color: reciter === r.id ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.style}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Who Starts? */}
              <div>
                <div style={sectionLabel}>Who Starts?</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onChange('whoStarts', 'app')}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-lg)', border: '1px solid', cursor: 'pointer',
                      borderColor: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--glass-border)',
                      background: params.whoStarts === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)',
                      color: params.whoStarts === 'app' ? '#000' : 'var(--text-secondary)',
                      fontWeight: '800', fontSize: '0.75rem',
                    }}
                  >App Starts</button>
                  <button
                    onClick={() => onChange('whoStarts', 'user')}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-lg)', border: '1px solid', cursor: 'pointer',
                      borderColor: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--glass-border)',
                      background: params.whoStarts === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)',
                      color: params.whoStarts === 'user' ? '#000' : 'var(--text-secondary)',
                      fontWeight: '800', fontSize: '0.75rem',
                    }}
                  >I Start</button>
                </div>
              </div>

              {/* Mic Sensitivity — Hands-Free only */}
              {(params.autoNext && !params.errorDetection) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{
                    background: 'var(--bg-accent)', padding: '1rem',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Settings2 size={12} style={{ color: 'var(--accent-gold)' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mic Sensitivity</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                        {currentVolume > params.micSensitivity ? '● SPEECH' : '○ SILENCE'}
                      </span>
                    </div>
                    <input
                      type="range" min="5" max="40"
                      value={45 - params.micSensitivity}
                      onChange={e => onChange('micSensitivity', 45 - Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-gold)', height: '4px' }}
                    />
                    <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                      <motion.div
                        style={{ height: '100%', opacity: 0.6, background: currentVolume > params.micSensitivity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                        animate={{ width: `${(currentVolume / 100) * 100}%` }}
                      />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(params.micSensitivity / 40) * 100}%`, width: '2px', background: 'var(--accent-gold)' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Accuracy Threshold — Smart Detection only */}
              {(params.autoNext && params.errorDetection) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{
                    background: 'var(--bg-accent)', padding: '1rem',
                    borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Accuracy Threshold</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#818cf8' }}>{params.errorThreshold ?? 50}%</span>
                    </div>
                    <input
                      type="range" min="50" max="100" step="5"
                      value={params.errorThreshold ?? 50}
                      onChange={e => onChange('errorThreshold', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#6366f1' }}
                    />
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                      Auto-advances only when <strong style={{ color: '#818cf8' }}>every verse</strong> individually meets the {params.errorThreshold ?? 50}% accuracy target with no unread words remaining.
                    </p>
                  </div>
                </motion.div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
