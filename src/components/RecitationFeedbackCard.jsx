import { motion, AnimatePresence } from 'framer-motion';
import RedBlinkOverlay from './RedBlinkOverlay';
import { CheckCircle2, XCircle, ChevronRight, AlertTriangle, Mic, ArrowLeftRight, MinusCircle, PlusCircle } from 'lucide-react';

// ── Colour + label config per status ────────────────────────────────────────
const STATUS_CONFIG = {
  correct: { color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.12)', label: 'Correct' },
  omission: { color: 'var(--accent-red)', bg: 'rgba(220,38,38,0.12)', label: 'Omission' },
  substitution: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Substitution' },
  insertion: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)', label: 'Extra' },
};

/**
 * RecitationFeedbackCard
 *
 * Shown after the user completes their recitation turn.
 * Displays:
 *   - Accuracy ring (green / amber / red)
 *   - Error breakdown pill row (correct / omission / substitution / insertion counts)
 *   - Word-by-word diff:
 *       ✅ correct      — green
 *       🔴 omission     — red underline (word was skipped entirely)
 *       🟠 substitution — amber with what was said shown below in small text
 *       ⬜ insertion    — muted italic (extra word not in text)
 *   - Raw STT transcript (dimmed)
 *   - Log Stumble + Continue buttons
 */
const RecitationFeedbackCard = ({ results, insertions = [], breakdown, chunk, transcript, onContinue, onLogStumble }) => {
  if (!results) return null;

  const accuracy = breakdown
    ? Math.round((breakdown.correct / (breakdown.correct + breakdown.omissions + breakdown.substitutions)) * 100) || 0
    : Math.round((results.filter(r => r.status === 'correct').length / (results.length || 1)) * 100);

  const ringColour =
    accuracy >= 80 ? 'var(--accent-emerald)' :
      accuracy >= 60 ? '#f59e0b' :
        'var(--accent-red)';

  const ringLabel =
    accuracy >= 80 ? 'Excellent' :
      accuracy >= 60 ? 'Needs Work' :
        'Review Needed';

  const hasMissedWords = results.some(r => r.status === 'omission' || r.status === 'substitution');

  // Merge expected words + insertions into single display list (insertions interleaved at end for simplicity)
  const displayWords = [
    ...results,
    ...insertions,
  ];

  return (
    <>
      {hasMissedWords && <RedBlinkOverlay active={hasMissedWords} />}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 200,
            padding: '0 1rem 2rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '640px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(24px)',
              border: `1px solid ${ringColour}33`,
              boxShadow: `0 -4px 40px ${ringColour}22`,
            }}
          >
            {/* ── Header: accuracy ring + label ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', flexShrink: 0, width: 60, height: 60 }}>
                <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                  <circle
                    cx="30" cy="30" r="24"
                    fill="none"
                    stroke={ringColour}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - accuracy / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '900', color: ringColour, lineHeight: 1 }}>{accuracy}%</span>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', margin: 0 }}>
                  Recitation Check
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: '800', color: ringColour, margin: '0.1rem 0 0' }}>{ringLabel}</p>
              </div>

              {accuracy >= 80
                ? <CheckCircle2 size={22} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                : accuracy >= 60
                  ? <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
                  : <XCircle size={22} color="var(--accent-red)" style={{ flexShrink: 0 }} />
              }
            </div>

            {/* ── Breakdown pills ── */}
            {breakdown && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <BreakdownPill icon={<CheckCircle2 size={10} />} count={breakdown.correct} label="Correct" color={STATUS_CONFIG.correct.color} bg={STATUS_CONFIG.correct.bg} />
                <BreakdownPill icon={<MinusCircle size={10} />} count={breakdown.omissions} label="Omitted" color={STATUS_CONFIG.omission.color} bg={STATUS_CONFIG.omission.bg} />
                <BreakdownPill icon={<ArrowLeftRight size={10} />} count={breakdown.substitutions} label="Substituted" color={STATUS_CONFIG.substitution.color} bg={STATUS_CONFIG.substitution.bg} />
                {breakdown.insertions > 0 && (
                  <BreakdownPill icon={<PlusCircle size={10} />} count={breakdown.insertions} label="Extra" color={STATUS_CONFIG.insertion.color} bg={STATUS_CONFIG.insertion.bg} />
                )}
              </div>
            )}

            {/* ── Word-by-word diff ── */}
            {displayWords.length > 0 && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                maxHeight: '200px',
                overflowY: 'auto',
                direction: 'rtl',
                fontFamily: "'Noto Naskh Arabic', 'KFGQPC HAFS Uthmanic Script', serif",
                lineHeight: '2.6',
                wordSpacing: '0.2rem',
              }}>
                {displayWords.map((item, idx) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.correct;
                  return (
                    <span
                      key={idx}
                      title={item.status === 'substitution' && item.spokenWord ? `You said: ${item.spokenWord}` : undefined}
                      style={{
                        display: 'inline-block',
                        marginLeft: '0.35rem',
                        position: 'relative',
                      }}
                    >
                      {/* Main word */}
                      <span style={{
                        fontSize: '1.1rem',
                        color: cfg.color,
                        background: cfg.bg,
                        borderRadius: '4px',
                        padding: '0 3px',
                        fontWeight: item.status === 'correct' ? '400' : '700',
                        textDecoration: item.status === 'omission' ? 'underline wavy var(--accent-red)' : 'none',
                        fontStyle: item.status === 'insertion' ? 'italic' : 'normal',
                        opacity: item.status === 'insertion' ? 0.6 : 1,
                      }}>
                        {item.word}
                      </span>
                      {/* What user actually said (substitution only) */}
                      {item.status === 'substitution' && item.spokenWord && (
                        <span style={{
                          display: 'block',
                          fontSize: '0.65rem',
                          color: '#f59e0b',
                          opacity: 0.75,
                          textAlign: 'center',
                          marginTop: '-4px',
                          fontFamily: 'inherit',
                          direction: 'rtl',
                        }}>
                          ↑ {item.spokenWord}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── Legend ── */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { status: 'correct', label: 'Correct' },
                { status: 'omission', label: 'Omitted' },
                { status: 'substitution', label: 'Wrong word' },
                { status: 'insertion', label: 'Extra' },
              ].map(({ status, label }) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_CONFIG[status].color, opacity: 0.85 }} />
                  <span style={{ fontSize: '0.55rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* ── STT transcript ── */}
            {transcript && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
              }}>
                <Mic size={10} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                <p style={{
                  fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0,
                  direction: 'rtl', fontFamily: 'inherit', lineHeight: 1.6,
                }}>
                  {transcript.trim().slice(0, 220)}{transcript.length > 220 ? '…' : ''}
                </p>
              </div>
            )}

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {hasMissedWords && chunk && chunk.length > 0 && (
                <button
                  onClick={() => chunk.forEach(ayah => onLogStumble && onLogStumble(ayah))}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--accent-red)',
                    background: 'rgba(220,38,38,0.1)',
                    color: 'var(--accent-red)',
                    fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  <XCircle size={13} /> Log Stumble
                </button>
              )}
              <button
                onClick={onContinue}
                style={{
                  flex: 2, padding: '0.75rem', borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: 'var(--accent-gold)',
                  color: '#000',
                  fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// ── Small reusable breakdown pill ───────────────────────────────────────────
const BreakdownPill = ({ icon, count, label, color, bg }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.25rem 0.6rem', borderRadius: '999px',
    background: bg, border: `1px solid ${color}44`,
  }}>
    <span style={{ color, display: 'flex' }}>{icon}</span>
    <span style={{ fontSize: '0.7rem', fontWeight: '800', color }}>{count}</span>
    <span style={{ fontSize: '0.58rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
  </div>
);

export default RecitationFeedbackCard;
