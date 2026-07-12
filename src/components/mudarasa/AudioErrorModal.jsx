import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, FastForward } from 'lucide-react';

export const AudioErrorModal = ({ audioError, setAudioError, onResume, onNext }) => {
  return (
    <AnimatePresence>
      {audioError && (
        <motion.div
          key="audio-error-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              width: '100%', maxWidth: '22rem',
              borderRadius: '2rem',
              background: 'var(--bg-secondary, #111118)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              boxShadow: '0 8px 48px rgba(220,38,38,0.15), 0 4px 24px rgba(0,0,0,0.5)',
              padding: '2rem 1.75rem',
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
              <div style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <WifiOff size={22} color="rgba(220, 38, 38, 0.9)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>Audio Unavailable</h3>
                <p style={{ fontSize: '0.8rem', margin: '0.4rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This surah's audio isn't downloaded. Connect to the internet to stream, or skip the app's turn.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={() => { setAudioError(false); onResume(); }}
                style={{
                  height: '3.25rem', borderRadius: '1rem', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(16,185,129,0.15))',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.75rem',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={() => { setAudioError(false); onNext(); }}
                style={{
                  height: '2.75rem', borderRadius: '1rem', cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.65rem',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: 0.6,
                  transition: 'all 0.2s',
                }}
              >
                <FastForward size={12} /> Skip App's Turn
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
