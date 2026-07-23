import { useState, useRef, useCallback } from 'react';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const mergeTranscripts = (oldText, newText) => {
  const oldWords = oldText.trim().split(/\s+/).filter(Boolean);
  const newWords = newText.trim().split(/\s+/).filter(Boolean);
  
  if (oldWords.length === 0) return newText;
  if (newWords.length === 0) return oldText;
  
  let maxOverlap = 0;
  const maxPossible = Math.min(oldWords.length, newWords.length);
  
  for (let i = 1; i <= maxPossible; i++) {
    let match = true;
    for (let j = 0; j < i; j++) {
      if (oldWords[oldWords.length - i + j] !== newWords[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      maxOverlap = i;
    }
  }
  
  const mergedWords = [...oldWords, ...newWords.slice(maxOverlap)];
  return mergedWords.join(' ') + ' ';
};

export const useSpeechRecognition = ({
  onResult,
  onSpeechStart,
  onSpeechEnd,
  onEnd
}) => {
  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const hasSpeechRef = useRef(false);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    transcriptRef.current = '';
    hasSpeechRef.current = false;
    setTranscript('');

    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += chunk + ' ';
        } else {
          currentInterim += chunk + ' ';
        }
      }
      if (currentFinal) {
        transcriptRef.current = mergeTranscripts(transcriptRef.current, currentFinal);
      }
      const combined = mergeTranscripts(transcriptRef.current, currentInterim).trim();
      setTranscript(combined);

      if (onResult) onResult(combined);
    };

    recognition.onspeechstart = () => {
      hasSpeechRef.current = true;
      if (onSpeechStart) onSpeechStart();
    };

    recognition.onspeechend = () => {
      hasSpeechRef.current = true;
      if (onSpeechEnd) onSpeechEnd();
    };

    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current._shouldRestart) {
        try { recognition.start(); } catch (_) {}
      } else {
        setIsListening(false);
        if (onEnd) onEnd();
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
  }, [isSupported, SR, onResult, onSpeechStart, onSpeechEnd, onEnd]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
  }, []);

  const pauseRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }, []);

  const resumeRecognition = useCallback((isActive) => {
    if (!isActive) return;
    if (!recognitionRef.current) return;
    if (recognitionRef.current._shouldRestart) return;
    recognitionRef.current._shouldRestart = true;
    try { recognitionRef.current.start(); } catch (_) {}
    setIsListening(true);
  }, []);

  const abortRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    transcriptRef,
    hasSpeechRef,
    startListening,
    stopRecognition,
    pauseRecognition,
    resumeRecognition,
    abortRecognition,
    setIsListening,
    setTranscript
  };
};
