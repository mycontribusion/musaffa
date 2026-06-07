import { useState, useEffect, useRef, useCallback } from 'react';
import { compareRecitation } from '../utils/quranUtils';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/** Silence duration (ms) after onspeechend before auto-finish fires */
const AUTO_FINISH_DELAY = 1800;

/**
 * useRecitationCheck — Arabic speech-to-text hook for Musaffa error detection.
 *
 * @param {boolean}  isActive      - Start listening when true.
 * @param {string}   expectedText  - Canonical Arabic text for current chunk.
 * @param {Function} onAutoFinish  - Called automatically after the user goes
 *                                   silent (post-speech), so the turn can
 *                                   advance without a manual tap.
 *
 * Returns:
 *   isSupported  — false on Firefox / Safari
 *   isListening  — currently capturing
 *   transcript   — accumulated raw STT output
 *   results      — word-level comparison after stopAndCheck()
 *   startListening()
 *   stopAndCheck()  — stop recognition and run comparison
 *   clearResults()  — reset for next turn
 */
export const useRecitationCheck = (isActive, expectedText, onAutoFinish) => {
  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState(null);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const expectedRef = useRef(expectedText);
  const silenceTimerRef = useRef(null);   // auto-finish grace timer
  const hasSpeechRef = useRef(false);      // guard: only auto-finish after speech started
  const onAutoFinishRef = useRef(onAutoFinish); // stable ref so callbacks don't re-init

  // Keep refs in sync without restarting recognition
  useEffect(() => { expectedRef.current = expectedText; }, [expectedText]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clean up any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    transcriptRef.current = '';
    hasSpeechRef.current = false;
    setTranscript('');
    setResults(null);

    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += chunk + ' ';
        } else {
          interim += chunk;
        }
      }
      if (final) {
        transcriptRef.current += final;
        setTranscript(transcriptRef.current + interim);
      } else {
        setTranscript(transcriptRef.current + interim);
      }
      // No live comparison — runs once in stopAndCheck()
    };

    // ── Silence detection ────────────────────────────────────────────────────
    recognition.onspeechstart = () => {
      hasSpeechRef.current = true;
      // Cancel pending auto-finish (user resumed speaking)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.onspeechend = () => {
      // Only auto-finish if the user has actually spoken something
      if (!hasSpeechRef.current) return;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // If still in an active session, fire auto-finish
        if (recognitionRef.current?._shouldRestart && onAutoFinishRef.current) {
          onAutoFinishRef.current();
        }
      }, AUTO_FINISH_DELAY);
    };
    // ─────────────────────────────────────────────────────────────────────────

    recognition.onend = () => {
      // Auto-restart unless we deliberately stopped
      if (recognitionRef.current && recognitionRef.current._shouldRestart) {
        try { recognition.start(); } catch (_) {}
      } else {
        setIsListening(false);
      }
    };

    recognition._shouldRestart = true;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Could not start STT:', e);
    }
  }, [isSupported, SR]);

  const stopAndCheck = useCallback(() => {
    if (!recognitionRef.current) return null;
    // Cancel any pending auto-finish timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    recognitionRef.current._shouldRestart = false;
    try { recognitionRef.current.stop(); } catch (_) {}
    setIsListening(false);

    // Run comparison once, off the critical path so the UI updates first
    setTimeout(() => {
      const spoken = transcriptRef.current.trim();
      const expected = expectedRef.current || '';
      const comparison = compareRecitation(expected, spoken);
      setResults(comparison);
    }, 0);
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  // Auto-start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  return { isSupported, isListening, transcript, results, startListening, stopAndCheck, clearResults };
};
