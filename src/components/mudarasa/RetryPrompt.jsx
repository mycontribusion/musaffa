import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, FastForward } from 'lucide-react';

export const RetryPrompt = ({ retryPrompt, setRetryPrompt, handleRetryVerse, handleMarkSatisfied }) => {
  return (
    <AnimatePresence>
      {retryPrompt && (
        <motion.div
          key="retry-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setRetryPrompt(null); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              width: '100%', maxWidth: '26rem',
              borderRadius: '2rem',
              background: 'var(--bg-secondary, #111118)',
              border: '1px solid rgba(245,158,11,0.25)',
              boxShadow: '0 -4px 48px rgba(0,0,0,0.6)',
              padding: '1.75rem',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '0.875rem', flexShrink: 0,
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={16} color="rgba(245,158,11,0.9)" />
              </div>
              <div>
                <p style={{ fontWeight: '900', fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>Not quite there yet</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.15rem 0 0', fontWeight: '600' }}>
                  {retryPrompt.accuracy !== null ? `${retryPrompt.accuracy}% accuracy · ` : ''}Review and try again
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {retryPrompt.reasons.map((reason, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.12)',
                }}>
                  <span style={{ color: 'rgba(245,158,11,0.8)', fontSize: '0.7rem', marginTop: '0.05rem', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', lineHeight: 1.4 }}>{reason}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={handleRetryVerse}
                style={{
                  height: '3.25rem', borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(16,185,129,0.2))',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.75rem',
                  textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={14} /> Try Again
              </button>
              <button
                onClick={handleMarkSatisfied}
                style={{
                  height: '2.75rem', borderRadius: '1rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.65rem',
                  textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: 0.6,
                  transition: 'all 0.2s',
                }}
              >
                <FastForward size={12} /> Skip Verse
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
