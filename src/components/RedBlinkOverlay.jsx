import { motion, AnimatePresence } from 'framer-motion';

/**
 * RecitationStatusOverlay – provides continuous hands-free visual feedback.
 *
 * mode:
 *   'error'   → continuous red pulse — stays until all errors are resolved
 *   null      → invisible
 */
const RecitationStatusOverlay = ({ mode }) => {
  const isError = mode === 'error';

  return (
    <AnimatePresence>
      {isError && (
        <motion.div
          key="error-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(239, 68, 68, 1)',
            pointerEvents: 'none',
            zIndex: 300,
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default RecitationStatusOverlay;
