import { useState, useEffect, useRef, useCallback } from 'react';
import { compareRecitation } from '../utils/quranUtils';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * useRecitationCheck — Arabic speech-to-text hook for Musaffa error detection.
 *
 * @param {boolean} isActive   - Start listening when true.
 * @param {string}  expectedText - Canonical Arabic text for current chunk.
 *
 * Returns:
 *   isSupported  — false on Firefox / Safari
 *   isListening  — currently capturing
 *   transcript   — accumulated raw STT output
 *   results      — { results: [{word, status}], accuracy } after stopAndCheck()
 *   startListening()
 *   stopAndCheck()  — stop recognition and run comparison
 *   clearResults()  — reset for next turn
 */
export const useRecitationCheck = (isActive, expectedText) => {
  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState(null);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const expectedRef = useRef(expectedText);
  // Debounce timer for live comparison to avoid UI freeze
  const compareTimer = useRef(null);

  // Keep expectedRef in sync without restarting recognition
  useEffect(() => {
    expectedRef.current = expectedText;
  }, [expectedText]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clean up any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    transcriptRef.current = '';
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
      // Debounced live comparison to avoid UI freeze
      if (compareTimer.current) clearTimeout(compareTimer.current);
      compareTimer.current = setTimeout(() => {
        const combined = (transcriptRef.current + interim).trim();
        const liveComp = compareRecitation(expectedRef.current, combined);
        setResults(liveComp);
      }, 250);
    };

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

    // Clear any pending debounce when starting new session
    if (compareTimer.current) {
      clearTimeout(compareTimer.current);
    }

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Could not start STT:', e);
    }
  }, [isSupported, SR]);

  const stopAndCheck = useCallback(() => {
    if (!recognitionRef.current) return null;
    // Stop speech recognition and cancel debounce
    recognitionRef.current._shouldRestart = false;
    try { recognitionRef.current.stop(); } catch (_) {}
    if (compareTimer.current) {
      clearTimeout(compareTimer.current);
    }
    setIsListening(false);

    const spoken = transcriptRef.current.trim();
    const expected = expectedRef.current || '';
    const comparison = compareRecitation(expected, spoken);
    setResults(comparison);
    return comparison;
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
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      if (compareTimer.current) {
        clearTimeout(compareTimer.current);
      }
    };
  }, []);

  return { isSupported, isListening, transcript, results, startListening, stopAndCheck, clearResults };
};
