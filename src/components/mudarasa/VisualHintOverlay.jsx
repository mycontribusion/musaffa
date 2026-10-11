import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X, Sparkles } from 'lucide-react';

/**
 * VisualHintOverlay - displays a red screen overlay showing up to 5 words
 * in large Arabic text when the reciter is stuck on an Ayah.
 */
export const VisualHintOverlay = ({ hint, onDismiss, isAudioPlaying }) => {
  if (!hint) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="visual-hint-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(185, 28, 28, 0.96) 0%, rgba(127, 29, 29, 0.98) 70%, rgba(69, 10, 10, 0.99) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          userSelect: 'none',
        }}
      >
        {/* Close button in top-right corner */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '2.5rem',
            height: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="Dismiss hint"
        >
          <X size={20} />
        </button>

        {/* Content Card */}
        <motion.div
          initial={{ scale: 0.92, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '850px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.5rem',
          }}
        >
          {/* Header pill badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} color="#fde047" />
            <span>تَلْمِيح • HINT</span>
            {hint.numberInSurah && (
              <span style={{ opacity: 0.85, marginLeft: '0.3rem' }}>
                (Ayah {hint.numberInSurah})
              </span>
            )}
          </div>

          {/* Large text showing up to 5 words */}
          <div
            className="arabic-text"
            style={{
              fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)',
              lineHeight: 1.6,
              direction: 'rtl',
              textAlign: 'center',
              color: '#ffffff',
              fontWeight: '700',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.5)',
              padding: '0.5rem 1rem',
              wordSpacing: '0.2rem',
            }}
          >
            {hint.text}
          </div>

          {/* Footer status / instruction */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            {isAudioPlaying && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#fef08a',
                  fontWeight: '700',
                }}
              >
                <Volume2 size={16} />
                <span>Audio Hint Playing...</span>
              </div>
            )}
            <div style={{
              direction: 'rtl',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <span style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#fff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
              }}>
                {hint.verseStartText || 'Recite or tap anywhere to dismiss'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VisualHintOverlay;

