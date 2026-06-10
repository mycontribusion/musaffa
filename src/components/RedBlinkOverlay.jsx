import { motion, AnimatePresence } from 'framer-motion';

/**
 * RecitationStatusOverlay – provides continuous hands-free visual feedback.
 *
 * mode:
 *   'error'   → continuous red pulse — stays until all errors are resolved
 *   'correct' → gentle green pulse — the recitation is on track
 *   null      → invisible
 */
const RecitationStatusOverlay = ({ mode }) => {
  const isError = mode === 'error';
  const isCorrect = mode === 'correct';

  return (
    <AnimatePresence>
      {isError && (
        <motion.div
          key="error-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.45, 0.15] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(239, 68, 68, 1)',
            pointerEvents: 'none',
            zIndex: 300,
          }}
        />
      )}
      {isCorrect && (
        <motion.div
          key="correct-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.04, 0.12, 0.04] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 185, 129, 1)',
            pointerEvents: 'none',
            zIndex: 300,
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default RecitationStatusOverlay;
