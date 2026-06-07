import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, AlertTriangle, Mic } from 'lucide-react';

/**
 * RecitationFeedbackCard
 *
 * Shown after the user completes their recitation turn.
 * Displays:
 *   - Accuracy ring (green / amber / red)
 *   - Word-by-word diff (correct = green, missed = red/faded)
 *   - Log Stumble button per ayah that had errors
 *   - Continue / Dismiss buttons
 *
 * Props:
 *   results       — { results: [{word, status}], accuracy } from useRecitationCheck
 *   chunk         — current chunk array of ayah objects (for "Log Stumble" context)
 *   transcript    — raw STT text (shown for transparency)
 *   onContinue    — advance to the next turn
 *   onLogStumble  — (ayah) => void
 */
const RecitationFeedbackCard = ({ results, chunk, transcript, onContinue, onLogStumble }) => {
  if (!results) return null;

  const { accuracy } = results;

  const ringColour =
    accuracy >= 80 ? 'var(--accent-emerald)' :
    accuracy >= 60 ? '#f59e0b' :
    'var(--accent-red)';

  const ringLabel =
    accuracy >= 80 ? 'Excellent' :
    accuracy >= 60 ? 'Needs Work' :
    'Review Needed';

  // Determine which ayahs had errors (any 'missed' word that belongs to this ayah)
  // For simplicity, flag the whole chunk if any words are missed
  const hasMissedWords = results.results.some(r => r.status === 'missed');

  return (
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
            gap: '1.25rem',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${ringColour}33`,
            boxShadow: `0 -4px 40px ${ringColour}22`,
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Accuracy ring */}
            <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke={ringColour}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - accuracy / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: ringColour, lineHeight: 1 }}>
                  {accuracy}%
                </span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.55rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
                Recitation Check
              </p>
              <p style={{ fontSize: '1rem', fontWeight: '800', color: ringColour, margin: '0.15rem 0 0' }}>
                {ringLabel}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                {results.results.filter(r => r.status === 'correct').length} / {results.results.length} words matched
              </p>
            </div>

            {accuracy >= 80
              ? <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
              : accuracy >= 60
                ? <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
                : <XCircle size={24} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            }
          </div>

          {/* Word-by-word diff */}
          {results.results.length > 0 && (
            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                maxHeight: '180px',
                overflowY: 'auto',
                direction: 'rtl',
                fontFamily: "'Noto Naskh Arabic', 'KFGQPC HAFS Uthmanic Script', serif",
                fontSize: '1.15rem',
                lineHeight: '2.2',
                wordSpacing: '0.2rem',
              }}
            >
              {results.results.map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    marginLeft: '0.35rem',
                    color: item.status === 'correct'
                      ? 'var(--accent-emerald)'
                      : 'var(--accent-red)',
                    opacity: item.status === 'correct' ? 0.9 : 1,
                    fontWeight: item.status === 'missed' ? '700' : '400',
                    textDecoration: item.status === 'missed' ? 'underline wavy var(--accent-red)' : 'none',
                    transition: 'color 0.3s',
                  }}
                >
                  {item.word}
                </span>
              ))}
            </div>
          )}

          {/* STT transcript (dimmed, for transparency) */}
          {transcript && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.6rem 0.75rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
            }}>
              <Mic size={11} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
              <p style={{
                fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0,
                direction: 'rtl', fontFamily: 'inherit', lineHeight: 1.6,
              }}>
                {transcript.trim().slice(0, 200)}{transcript.length > 200 ? '…' : ''}
              </p>
            </div>
          )}

          {/* Action buttons */}
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
  );
};

export default RecitationFeedbackCard;
