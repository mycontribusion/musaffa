import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { VoskSpeechRecognition } from '../platform/voskPlugin';

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
      if (oldWords[oldWords.length - i + j] !== newWords[j]) { match = false; break; }
    }
    if (match) maxOverlap = i;
  }
  return [...oldWords, ...newWords.slice(maxOverlap)].join(' ') + ' ';
};

export const useSpeechRecognition = ({
  onResult,
  onSpeechStart,
  onSpeechEnd,
  onEnd,
  modelReady = false,
  modelStatus = 'idle',
  ensureModelReady = null,
  grammar = null,
}) => {
  const isNative = Capacitor.isNativePlatform();
  const SR = getSpeechRecognition();
  const isSupported = true;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const hasSpeechRef = useRef(false);
  const partialListenerRef = useRef(null);
  const resultListenerRef = useRef(null);
  const errorListenerRef = useRef(null);

  // Accumulator for finalized words across the user's turn.
  // Persists through partial/result events and is only cleared when
  // the app takes its turn (audio playback / prompt).
  const confirmedTranscriptRef = useRef('');
  const currentPartialRef = useRef('');

  // Setup Vosk listeners for native Android (speech recognition only, not download)
  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;
    const setupListeners = async () => {
      try {
         // Partial results listener (live streaming speech)
         const partialListener = await VoskSpeechRecognition.addListener('partialResult', (data) => {
           if (!isMounted) return;
           if (data && data.text) {
             if (!hasSpeechRef.current) {
               hasSpeechRef.current = true;
               if (onSpeechStart) onSpeechStart();
             }

             // Vosk partialResult gives the live in-progress hypothesis for the
             // CURRENT utterance segment (not the full accumulated history).
             // Store it as currentPartial and display confirmed + partial together.
             // Using mergeTranscripts here risks incorrectly swallowing words when
             // consecutive ayahs share vocabulary — simple concat is safer.
             currentPartialRef.current = data.text.trim();
             const display = [confirmedTranscriptRef.current, currentPartialRef.current]
               .filter(Boolean).join(' ');

             transcriptRef.current = display;
             setTranscript(display);
             if (onResult) onResult(display);
           }
         });
         partialListenerRef.current = partialListener;

         // Final results listener (emitted when Vosk detects a silence pause).
         // The @deentech/vosk plugin fires DELTAS (Option A): each 'result' event
         // carries only the words spoken in that silence-bounded segment — Vosk
         // resets its internal buffer after each pause. Direct append is correct;
         // mergeTranscripts is WRONG here because it would swallow words that
         // phonetically overlap with the tail of the previous segment.
         const resultListener = await VoskSpeechRecognition.addListener('result', (data) => {
           if (!isMounted) return;
           if (data && data.text && data.isFinal) {
             const chunkText = data.text.trim();

             if (chunkText) {
               // Direct append — delta from this utterance segment.
               confirmedTranscriptRef.current = confirmedTranscriptRef.current
                 ? confirmedTranscriptRef.current + ' ' + chunkText
                 : chunkText;
             }

             currentPartialRef.current = '';
             transcriptRef.current = confirmedTranscriptRef.current;
             setTranscript(confirmedTranscriptRef.current);
             if (onResult) onResult(confirmedTranscriptRef.current);
           }
         });
         resultListenerRef.current = resultListener;

        // Error listener
        const errorListener = await VoskSpeechRecognition.addListener('error', (data) => {
          if (!isMounted) return;
          console.error('[VoskSpeech] Error:', data.error);
          setIsListening(false);
          if (onEnd) onEnd();
        });
        errorListenerRef.current = errorListener;

        // Timeout listener — Vosk fires this on long silence; treat as a soft
        // end so the UI state stays consistent even if no more audio comes.
        await VoskSpeechRecognition.addListener('timeout', () => {
          if (!isMounted) return;
          console.warn('[VoskSpeech] Recognition timeout (long silence)');
          setIsListening(false);
          if (onEnd) onEnd();
        });
      } catch (err) {
        console.warn('[VoskSpeech] Listener setup error:', err);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      if (partialListenerRef.current) {
        try { partialListenerRef.current.remove(); } catch { /* ignore */ }
      }
      if (resultListenerRef.current) {
        try { resultListenerRef.current.remove(); } catch { /* ignore */ }
      }
      if (errorListenerRef.current) {
        try { errorListenerRef.current.remove(); } catch { /* ignore */ }
      }
    };
  // IMPORTANT: grammar is intentionally NOT in the dep array here.
  // The Vosk plugin applies the grammar at startListening() call time (not at
  // listener-setup time), so the listeners themselves are stateless with
  // respect to grammar. Adding grammar here caused a new set of listeners to
  // be stacked on top of existing ones every time the user advanced to the
  // next chunk — resulting in duplicate/multiplied result events.
  // The grammar is passed fresh to VoskSpeechRecognition.startListening()
  // inside startListening/resumeListening, so vocabulary updates are applied
  // correctly without requiring listener re-registration.
  }, [isNative, onResult, onSpeechStart, onEnd]);

  const lastGrammarRef = useRef(grammar);

  // Dynamic single-verse grammar update on verse change while listening.
  // CRITICAL: We DO NOT reset confirmedTranscriptRef here, keeping the full
  // turn transcript accumulated so far.
  useEffect(() => {
    if (!isListening || !grammar) {
      lastGrammarRef.current = grammar;
      return;
    }

    if (lastGrammarRef.current === grammar) return;
    lastGrammarRef.current = grammar;

    if (isNative) {
      console.log('[VoskSpeech] Updating native single-verse grammar dynamically on verse transition');
      VoskSpeechRecognition.startListening({ grammar }).catch((err) => {
        console.warn('[VoskSpeech] Dynamic grammar update failed:', err);
      });
    }
  }, [grammar, isListening, isNative]);


   const startListening = useCallback(async () => {
      // On native Android, ensure the Vosk model is ready before starting STT
      if (isNative && modelStatus !== 'ready') {
        if (ensureModelReady) {
          try {
            await ensureModelReady();
          } catch (err) {
            console.error('[VoskSpeech] Model ready failed:', err);
            setIsListening(false);
            if (onEnd) onEnd();
            return;
          }
        } else if (!modelReady) {
          // No ensureModelReady callback provided and model not ready — cannot start
          console.warn('[VoskSpeech] Cannot start listening: model not ready and no ensureModelReady callback provided');
          setIsListening(false);
          if (onEnd) onEnd();
          return;
        }
      }

      confirmedTranscriptRef.current = '';
      currentPartialRef.current = '';
      hasSpeechRef.current = false;
      setTranscript('');
     setIsListening(true);

      // ── NATIVE VOSK IMPLEMENTATION (Android) ───────────────────────────
      if (isNative) {
        try {
          const voskOptions = {};
          if (grammar) {
            voskOptions.grammar = grammar;
          }
          await VoskSpeechRecognition.startListening(voskOptions);
          setIsListening(true);
          return;
        } catch (err) {
          console.error('[VoskSpeech] start error:', err);
          setIsListening(false);
          if (onEnd) onEnd();
          return;
        }
      }

     // ── BROWSER PWA IMPLEMENTATION ─────────────────────────────────────
     if (SR) {
       if (recognitionRef.current) {
         try { recognitionRef.current.abort(); } catch { /* ignore */ }
       }

       const recognition = new SR();
       recognition.lang = 'ar-SA';
       recognition.continuous = true;
       recognition.interimResults = true;
       recognition.maxAlternatives = 1;

       // BUG FIX (Bug #2): Apply vocabulary constraint to Web Speech API path.
       // SpeechGrammarList is supported in Chrome. Most cloud ASR engines ignore
       // it, but it marginally biases recognition toward known Quranic words and
       // costs nothing. The real fix for full constraint is the native Vosk path.
       if (grammar && window.SpeechGrammarList) {
         try {
           const grammarList = new window.SpeechGrammarList();
           const words = JSON.parse(grammar);
           // Convert word array to JSGF format (the format Web Speech API accepts)
           const jsgf = `#JSGF V1.0; grammar words; public <word> = ${words.join(' | ')};`;
           grammarList.addFromString(jsgf, 1);
           recognition.grammars = grammarList;
         } catch (e) {
           // Non-fatal — continue without grammar constraint if parsing fails
           console.warn('[WebSpeech] Failed to set grammar list:', e);
         }
       }

        recognition.onresult = (event) => {
          let currentFinal = '';
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) currentFinal += chunk + ' ';
            else currentInterim += chunk + ' ';
          }
          if (currentFinal) {
            // Use mergeTranscripts to handle overlap between
            // previously confirmed text and newly finalized text.
            confirmedTranscriptRef.current = mergeTranscripts(
              confirmedTranscriptRef.current,
              currentFinal.trim()
            ).trim();
          }
          currentPartialRef.current = currentInterim.trim();

          const fullText = [confirmedTranscriptRef.current, currentPartialRef.current]
            .filter(Boolean)
            .join(' ');

          if (fullText) {
            transcriptRef.current = fullText;
            if (!hasSpeechRef.current) {
              hasSpeechRef.current = true;
              if (onSpeechStart) onSpeechStart();
            }
            setTranscript(fullText);
            if (onResult) onResult(fullText);
          }
        };

        recognition.onspeechstart = () => {
          hasSpeechRef.current = true;
          if (onSpeechStart) onSpeechStart();
        };

        recognition.onspeechend = () => {
          if (onSpeechEnd) onSpeechEnd();
        };

        recognition.onerror = (event) => {
          console.warn('Web Speech API error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          if (recognitionRef.current && recognitionRef.current._shouldRestart) {
            try { recognition.start(); } catch { /* ignore */ }
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
          return;
        } catch (e) {
          console.warn('Web Speech API start failed:', e);
          setIsListening(false);
        }
      }
    }, [isNative, SR, modelReady, modelStatus, ensureModelReady, grammar, onResult, onSpeechStart, onSpeechEnd, onEnd]);

   // Resume listening without resetting the accumulated transcript.
   // Used after temporary pauses (e.g. hint playback) so the full
   // conversation history is preserved across pauses during the user's turn.
   const resumeListening = useCallback(async () => {
     setIsListening(true);

      // ── NATIVE VOSK IMPLEMENTATION (Android) ───────────────────────────
      if (isNative) {
        try {
          const voskOptions = {};
          if (grammar) {
            voskOptions.grammar = grammar;
          }
          await VoskSpeechRecognition.startListening(voskOptions);
          setIsListening(true);
          return;
        } catch (err) {
          console.error('[VoskSpeech] resume error:', err);
          setIsListening(false);
          if (onEnd) onEnd();
          return;
        }
      }

     // ── BROWSER PWA IMPLEMENTATION ─────────────────────────────────────
     if (SR) {
       if (recognitionRef.current) {
         try { recognitionRef.current.abort(); } catch { /* ignore */ }
       }

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
            if (event.results[i].isFinal) currentFinal += chunk + ' ';
            else currentInterim += chunk + ' ';
          }
          if (currentFinal) {
            // Use mergeTranscripts to handle overlap between
            // previously confirmed text and newly finalized text.
            confirmedTranscriptRef.current = mergeTranscripts(
              confirmedTranscriptRef.current,
              currentFinal.trim()
            ).trim();
          }
          currentPartialRef.current = currentInterim.trim();

          const fullText = [confirmedTranscriptRef.current, currentPartialRef.current]
            .filter(Boolean)
            .join(' ');

          if (fullText) {
            transcriptRef.current = fullText;
            if (!hasSpeechRef.current) {
              hasSpeechRef.current = true;
              if (onSpeechStart) onSpeechStart();
            }
            setTranscript(fullText);
            if (onResult) onResult(fullText);
          }
        };

        recognition.onspeechstart = () => {
          hasSpeechRef.current = true;
          if (onSpeechStart) onSpeechStart();
        };

        recognition.onspeechend = () => {
          if (onSpeechEnd) onSpeechEnd();
        };

        recognition.onerror = (event) => {
          console.warn('Web Speech API error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          if (recognitionRef.current && recognitionRef.current._shouldRestart) {
            try { recognition.start(); } catch { /* ignore */ }
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
          return;
        } catch (e) {
          console.warn('Web Speech API start failed:', e);
          setIsListening(false);
        }
      }
    }, [isNative, SR, grammar, onResult, onSpeechStart, onSpeechEnd, onEnd]);

  const stopRecognition = useCallback(async () => {
    if (isNative) {
      try {
        await VoskSpeechRecognition.stopListening();
      } catch (e) {
        console.warn('[VoskSpeech] stop error:', e);
      }
    } else if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
    if (onEnd) onEnd();
  }, [isNative, onEnd]);

  const pauseRecognition = useCallback(async () => {
    if (isNative) {
      try {
        await VoskSpeechRecognition.stopListening();
      } catch (e) {
        console.warn('[VoskSpeech] pause error:', e);
      }
    } else if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, [isNative]);

  const resumeRecognition = useCallback(async (isActive) => {
    if (!isActive) return;
    await resumeListening();
  }, [resumeListening]);

   const abortRecognition = useCallback(async () => {
     if (isNative) {
       try {
         await VoskSpeechRecognition.cancel();
       } catch (e) {
         console.warn('[VoskSpeech] abort error:', e);
       }
     } else if (recognitionRef.current) {
       recognitionRef.current._shouldRestart = false;
       try { recognitionRef.current.abort(); } catch { /* ignore */ }
     }
     setIsListening(false);
   }, [isNative]);

   // Clear the transcript accumulator strictly when the App takes its turn
   // (e.g. audio playback / prompt). This resets both confirmed and partial
   // so the user's next recitation starts with a clean slate.
    const clearTranscript = useCallback(() => {
      confirmedTranscriptRef.current = '';
      currentPartialRef.current = '';
      transcriptRef.current = '';
      setTranscript('');
    }, []);

   return {
     isSupported,
     isListening,
     transcript,
     transcriptRef,
     hasSpeechRef,
     startListening,
     resumeListening,
     stopRecognition,
     pauseRecognition,
     resumeRecognition,
     abortRecognition,
     clearTranscript,
     setIsListening,
     setTranscript
   };
};
