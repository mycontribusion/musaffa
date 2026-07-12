import { useState, useRef, useEffect } from 'react';

export const useFeedbackDebounce = (enableErrorDetection, liveResults, mudarasaTurn) => {
  const [flashError, setFlashError] = useState(false);
  const prevErrorCountRef = useRef(0);
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enableErrorDetection || !liveResults?.results || mudarasaTurn !== 'user') {
      prevErrorCountRef.current = 0;
      setFlashError(false);
      return;
    }

    const currentErrors = liveResults.results.filter(
      r => r.status === 'omission' || r.status === 'substitution'
    ).length;

    if (currentErrors > prevErrorCountRef.current) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        setFlashError(true);
        setTimeout(() => setFlashError(false), 500);
      }, 800);
    } else if (currentErrors < prevErrorCountRef.current) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setFlashError(false);
    }

    prevErrorCountRef.current = currentErrors;
  }, [liveResults, enableErrorDetection, mudarasaTurn]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  return flashError;
};
