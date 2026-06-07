import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * RedBlinkOverlay – flashes a semi‑transparent red overlay when `active` is true.
 * It appears for a brief moment (0.3 s) then fades out, providing a noticeable
 * error cue without blocking interaction. The component is lightweight and can
 * be dropped anywhere in the component tree.
 */
const RedBlinkOverlay = ({ active }) => {
  const [show, setShow] = useState(false);

  // Trigger the flash whenever `active` flips to true.
  useEffect(() => {
    if (active) {
      setShow(true);
    }
  }, [active]);

  // After the entry animation finishes, hide it so it can be re‑triggered.
  const handleAnimationComplete = () => {
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={handleAnimationComplete}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 0, 0, 0.4)',
            pointerEvents: 'none',
            zIndex: 300,
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default RedBlinkOverlay;
