import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecitationStatusOverlay from './RedBlinkOverlay';
import { ChevronLeft, Mic, WifiOff, RefreshCw, FastForward, BrainCircuit, AlertTriangle, CheckCircle2, BookOpen, BookX } from 'lucide-react';
import { removeTashkeel, normalizeArabic, expandMuqattaat } from '../utils/quranUtils';

const MudarasaView = ({
  chunks,
  currentChunkIndex,
  currentAyahNumber,
  mudarasaTurn,
  onNext,
  onBack,
  onLogStumble,
  isListening,
  currentVolume,
  sensitivity,
  isPaused,
  onPause,
  onResume,
  audioError,
  setAudioError,
  // Error detection props
  enableErrorDetection,
  isSttListening,
  liveResults,        // word-level live comparison from worker
  transcript,
  onFinishedTurn,
  onRetryTurn,        // clears STT results and re-listens to same verse
  onClearResults,
  quranSimple,        // plain text for error detection comparison
  targetAccuracy,     // threshold percentage
  retryStartIndex = 0,
  setRetryStartIndex,
}) => {

  // ── Text visibility toggle (applies to both turns) ──────────────────────
  const [showText, setShowText] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_show_text') ?? 'true'); } catch { return true; }
  });

  // Persist text visibility preference
  useEffect(() => {
    localStorage.setItem('quran_musaffa_show_text', JSON.stringify(showText));
  }, [showText]);

  // ── Find active verse index and its word offset ─────────────────────
  // sliceActiveAyahIndex: the verse the user is currently targeting.
  //
  // CRITICAL: A verse must have hasStarted===true before it can be counted as
  // "completed". Without this guard, the DP algorithm in the worker can match
  // words spoken in verse N into the word slots of verse N+1 (e.g. when common
  // words overlap), causing verse N+1 to appear green before the user ever
  // reaches it — which was the root cause of premature highlighting.
  let sliceActiveAyahIndex = 0;
  if (enableErrorDetection && liveResults && liveResults.verseStats) {
    for (let i = 0; i < liveResults.verseStats.length; i++) {
      const stat = liveResults.verseStats[i];
      // A verse can only be considered "done" when:
      //   1. hasStarted — the STT/DP has actually put at least one non-pending word in it
      //   2. !hasPending — every word in it has been evaluated (no words left pending)
      //   3. accuracy >= target — it meets the pass threshold
      if (stat.hasStarted && !stat.hasPending && stat.accuracy >= targetAccuracy) {
        sliceActiveAyahIndex = i + 1;
      } else {
        sliceActiveAyahIndex = i;
        break;
      }
    }
    if (sliceActiveAyahIndex >= liveResults.verseStats.length) {
      sliceActiveAyahIndex = liveResults.verseStats.length - 1;
    }
  }
  const activeAyahIndex = retryStartIndex + sliceActiveAyahIndex;

  let activeVerseWordOffset = 0;
  if (enableErrorDetection && liveResults && liveResults.verseStats && chunks[currentChunkIndex]) {
    const sliceActiveIdx = activeAyahIndex - retryStartIndex;
    const sliceChunk = chunks[currentChunkIndex].slice(retryStartIndex);
    for (let i = 0; i < sliceActiveIdx; i++) {
      const ayah = sliceChunk[i];
      if (!ayah) continue;
      let txt = ayah.text || '';
      if (quranSimple) {
        const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
        const simpleText = quranSimple[key];
        if (simpleText) txt = simpleText;
      }
      // Use the same text processing as buildAyahWordCounts in PartnerSession.jsx
      // to ensure word offset matches the expected text used by the worker
      const clean = removeTashkeel(txt);
      const expanded = expandMuqattaat(normalizeArabic(clean));
      activeVerseWordOffset += expanded.trim().split(/\s+/).filter(Boolean).length;
    }
  }


  // ── Retry prompt state ───────────────────────────────────────────────
  // null = hidden; object = visible with failure reasons
  const [retryPrompt, setRetryPrompt] = useState(null);

  const handleRetryVerse = () => {
    setRetryPrompt(null);
    setRetryStartIndex(activeAyahIndex);
    onRetryTurn();
  };

  const handleMarkSatisfied = () => {
    setRetryPrompt(null);
    if (activeAyahIndex < chunks[currentChunkIndex].length - 1) {
      setRetryStartIndex(activeAyahIndex + 1);
      onRetryTurn();
    } else {
      onFinishedTurn();
    }
  };

  // Called by both "Finished Reciting" and "Tap to finish early" buttons.
  const handleManualFinish = () => {
    if (!enableErrorDetection) {
      onFinishedTurn();
      return;
    }

    if (!liveResults || !liveResults.verseStats || liveResults.verseStats.length === 0) {
      setRetryPrompt({ reasons: ['No recitation was detected — please recite the verse.'], accuracy: null });
      return;
    }

    const activeStat = liveResults.verseStats[sliceActiveAyahIndex];
    const reasons = [];

    if (!activeStat) {
      reasons.push('Please recite the current verse.');
    } else {
      if (activeStat.hasPending) {
        reasons.push('Not all words of the current verse were read.');
      }
      if (activeStat.accuracy < targetAccuracy) {
        reasons.push(`Accuracy for the current verse is below target (${activeStat.accuracy}% / ${targetAccuracy}%)`);
      }
    }

    if (reasons.length > 0) {
      setRetryPrompt({ reasons, accuracy: activeStat ? activeStat.accuracy : null });
    } else {
      handleMarkSatisfied();
    }
  };

  // ── Inline criteria-failed detection ─────────────────────────────────
  const activeStat = liveResults?.verseStats?.[sliceActiveAyahIndex];
  const allWordsAttempted = !!(
    enableErrorDetection &&
    activeStat && !activeStat.hasPending
  );
  // criteriaFailed: verse was attempted but below threshold.
  // This is purely for display — the session always continues listening.
  const criteriaFailed = allWordsAttempted && activeStat && activeStat.accuracy < targetAccuracy;

  // ── Feedback Debounce (Vibration & Flash) ──────────────────────────────
  // The Web Speech API sends interim results. If it guesses a wrong word initially
  // but corrects it a moment later, we shouldn't punish the user with a vibrate/flash.
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
      // New error detected. Instead of firing immediately, wait to see if STT corrects it.
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

      errorTimeoutRef.current = setTimeout(() => {
        // Still an error after settling time? Fire subtle feedback.
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50); // Crisp, short tap (not aggressive 200ms)
        }
        setFlashError(true);
        // Fade the flash out quickly
        setTimeout(() => setFlashError(false), 500);
      }, 800); // 800ms grace period for STT to settle
    } else if (currentErrors < prevErrorCountRef.current) {
      // Error corrected itself! Cancel the pending flash/vibrate.
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setFlashError(false);
    }

    prevErrorCountRef.current = currentErrors;
  }, [liveResults, enableErrorDetection, mudarasaTurn]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Derived mode for the RedBlinkOverlay
  const overlayMode = flashError ? 'error' : null;

  // Transcript autoscroll ref
  const transcriptRef = useRef(null);
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Auto-scroll logic for live tracking
  const activeAyahIdRef = useRef(null);
  useEffect(() => {
    if (mudarasaTurn === 'user' && activeAyahIdRef.current) {
      const el = document.getElementById(activeAyahIdRef.current);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if the element is outside the comfortable reading zone (header is ~70px, footer is ~100px)
        const isOutsideView = rect.top < 150 || rect.bottom > (window.innerHeight - 200);
        if (isOutsideView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  });

  // Only show internet banner if STT is enabled but not running at all
  const showInternetBanner = enableErrorDetection && mudarasaTurn === 'user' && !isSttListening;

  return (
    <>
      <RecitationStatusOverlay mode={overlayMode} />
      {showInternetBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, padding: '0.5rem 1rem',
          background: 'rgba(255,165,0,0.2)', borderBottom: '1px solid rgba(255,165,0,0.5)',
          color: '#fff', textAlign: 'center', zIndex: 300, fontWeight: '600'
        }}>
          Smart Error Detection requires internet (Web Speech API)
        </div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
        {/* Dynamic Header */}
        <div style={{ position: 'sticky', top: '70px', zIndex: 90, padding: '1rem 0' }}>
          <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={onBack} className="icon-btn" style={{ width: '32px', height: '32px' }}><ChevronLeft size={16} /></button>
              <div>
                <span style={{ fontSize: '0.55rem', fontWeight: '900', color: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {mudarasaTurn === 'app' ? 'Listen' : 'Recite'}
                </span>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Portion {currentChunkIndex + 1} of {chunks.length}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Text visibility toggle — hide/show Quran text on both turns */}
              <button
                onClick={() => setShowText(v => !v)}
                title={showText ? 'Hide text' : 'Show text'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0.55rem 0.2rem 0.4rem',
                  borderRadius: '999px', cursor: 'pointer',
                  border: `1px solid ${showText ? 'var(--glass-border)' : 'rgba(212,175,55,0.4)'}`,
                  background: showText ? 'transparent' : 'rgba(212,175,55,0.08)',
                  transition: 'all 0.2s',
                }}
              >
                {showText
                  ? <BookOpen size={12} color="var(--text-muted)" />
                  : <BookX size={12} color="var(--accent-gold)" />}
                <span style={{
                  fontSize: '0.5rem', fontWeight: '800', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: showText ? 'var(--text-muted)' : 'var(--accent-gold)',
                  transition: 'color 0.2s',
                }}>
                  Text
                </span>
              </button>
              {/* Error detection indicator badge */}
              {enableErrorDetection && mudarasaTurn === 'user' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.25rem 0.5rem', borderRadius: '999px',
                  background: isSttListening ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isSttListening ? 'rgba(16,185,129,0.4)' : 'var(--glass-border)'}`,
                  transition: 'all 0.3s',
                }}>
                  <BrainCircuit size={10} color={isSttListening ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.5rem', fontWeight: '800', color: isSttListening ? 'var(--accent-emerald)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isSttListening ? 'Checking' : 'Ready'}
                  </span>
                </div>
              )}
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', boxShadow: mudarasaTurn === 'app' ? '0 0 10px var(--accent-gold)' : 'none' }} />
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: mudarasaTurn === 'user'
                  ? (isListening ? (currentVolume > sensitivity ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.15)') : 'var(--accent-emerald)')
                  : 'var(--bg-accent)',
                boxShadow: mudarasaTurn === 'user'
                  ? (isListening ? (currentVolume > sensitivity ? '0 0 10px var(--accent-emerald)' : 'none') : '0 0 10px var(--accent-emerald)')
                  : 'none',
                transition: 'all 0.1s'
              }} />
            </div>
          </div>
        </div>

        {/* Audio Error Modal Overlay */}
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
                {/* Icon + Header */}
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

                {/* Action buttons */}
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

        {/* Recitation Content */}
        <div style={{ flex: 1, padding: '1rem 0 6rem 0' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {(() => {
              let lastSpokenIdx = -1;
              if (enableErrorDetection && liveResults?.results) {
                for (let i = liveResults.results.length - 1; i >= 0; i--) {
                  if (liveResults.results[i].status !== 'pending') {
                    lastSpokenIdx = i;
                    break;
                  }
                }
              }

              return chunks[currentChunkIndex].map((ayah, idx) => {
                // Use quranSimple plain text for error detection when available
                let displayText = ayah.text;
                if (enableErrorDetection && quranSimple) {
                  const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
                  const simpleText = quranSimple[key];
                  if (simpleText) {
                    displayText = simpleText;
                  }
                }

                // Process the text the same way as word offset calculation
                // to ensure word positions match the expected text used by the worker
                const processedText = enableErrorDetection
                  ? expandMuqattaat(normalizeArabic(removeTashkeel(displayText))).trim()
                  : displayText;

                const isFirstAyahOfSurah = ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9;
                
                const isCompleted = enableErrorDetection && idx < activeAyahIndex;
                const isActive = !enableErrorDetection || idx === activeAyahIndex;
                const isLocked = enableErrorDetection && idx > activeAyahIndex;

                // Show live overlay only for the active verse
                const showLiveOverlay = enableErrorDetection && isSttListening && liveResults && mudarasaTurn === 'user' && isActive;

                if (isActive) {
                  activeAyahIdRef.current = `mudarasa-ayah-${ayah.number}`;
                }

                return (
                  <div 
                    key={ayah.number} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '2rem',
                      opacity: isLocked ? 0.2 : (isCompleted ? 0.8 : 1),
                      pointerEvents: isLocked ? 'none' : 'auto',
                      transition: 'all 0.4s ease',
                    }}
                  >
                    {isFirstAyahOfSurah && showText && !isCompleted && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: currentAyahNumber === `bismillah-${ayah.number}` ? 1.02 : 1 }}
                        style={{
                          textAlign: 'center',
                          padding: '1.5rem',
                          borderRadius: '1.5rem',
                          background: currentAyahNumber === `bismillah-${ayah.number}` ? 'var(--accent-gold-soft)' : 'transparent',
                          border: currentAyahNumber === `bismillah-${ayah.number}` ? '1px solid var(--accent-gold-soft)' : '1px solid transparent',
                          transition: '0.4s'
                        }}
                      >
                        <p className="arabic-text" style={{ fontSize: '2.5rem', color: currentAyahNumber === `bismillah-${ayah.number}` ? 'var(--accent-gold)' : 'var(--text-primary)', opacity: currentAyahNumber === `bismillah-${ayah.number}` ? 1 : 0.8 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
                      </motion.div>
                    )}
                    <motion.div
                      id={`mudarasa-ayah-${ayah.number}`}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1, 
                        scale: (ayah.number === currentAyahNumber || isActive) ? 1.01 : 1 
                      }}
                      style={{
                        textAlign: 'right', 
                        padding: '1.5rem', 
                        borderRadius: '1.5rem',
                        background: (ayah.number === currentAyahNumber || (isActive && !isLocked && !isCompleted)) ? 'var(--accent-gold-soft)' : 'transparent',
                        border: (ayah.number === currentAyahNumber || (isActive && !isLocked && !isCompleted)) ? '1px solid var(--accent-gold-soft)' : '1px solid transparent',
                        transition: '0.4s'
                      }}
                    >
                      {showText ? (
                        showLiveOverlay ? (
                          <LiveTextOverlay
                            plainText={processedText}
                            results={liveResults.results}
                            numberInSurah={ayah.numberInSurah}
                            wordOffset={activeVerseWordOffset}
                          />
                        ) : (
                          <p 
                            className="arabic-text" 
                            style={{ 
                              fontSize: '2.2rem', 
                              color: isCompleted ? 'var(--accent-emerald)' : ((ayah.number === currentAyahNumber || isActive) ? 'var(--accent-gold)' : 'var(--text-primary)') 
                            }}
                          >
                            {displayText}{' '}
                            <span style={{ fontSize: '1.2rem', color: isCompleted ? 'var(--accent-emerald)' : 'var(--accent-gold)', opacity: 0.5, marginRight: '0.5rem' }}>
                              ﴿{ayah.numberInSurah}﴾
                            </span>
                            {isCompleted && (
                              <CheckCircle2 size={16} style={{ display: 'inline-block', marginRight: '0.5rem', color: 'var(--accent-emerald)', verticalAlign: 'middle' }} />
                            )}
                          </p>
                        )
                      ) : (
                        /* Text hidden — show verse number only as a placeholder */
                        <p style={{ fontSize: '1rem', color: isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)', opacity: isCompleted ? 0.8 : 0.4, textAlign: 'center', fontWeight: '700', letterSpacing: '0.1em' }}>
                          {isCompleted ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                              — {ayah.numberInSurah} — <CheckCircle2 size={12} />
                            </span>
                          ) : (
                            `— ${ayah.numberInSurah} —`
                          )}
                        </p>
                      )}
                    </motion.div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', zIndex: 100, display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {mudarasaTurn === 'user' && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

                {enableErrorDetection && isSttListening ? (
                  // ── Auto-detect mode: just the action row + accuracy ──
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>

                        <button
                          onClick={handleMarkSatisfied}
                          style={{
                            padding: '0.45rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
                            border: '1px solid rgba(16,185,129,0.3)',
                            background: 'rgba(16,185,129,0.08)',
                            color: 'var(--accent-emerald)', fontWeight: '800', fontSize: '0.65rem',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            transition: 'all 0.2s',
                          }}
                        >
                          <CheckCircle2 size={10} /> Mark Satisfied
                        </button>
                      </div>
                      {activeStat && (
                        <span style={{ color: activeStat.accuracy < targetAccuracy ? 'rgba(245,158,11,0.8)' : 'var(--accent-emerald)', opacity: 0.9, fontWeight: '800', fontSize: '0.65rem' }}>
                          Verse {chunks[currentChunkIndex]?.[activeAyahIndex]?.numberInSurah} Accuracy: {activeStat.accuracy}% / {targetAccuracy}%
                        </span>
                      )}
                    </div>
                    {transcript && (
                      <div
                        ref={transcriptRef}
                        style={{
                          maxWidth: '90vw',
                          maxHeight: '3.5rem',
                          overflowY: 'auto',
                          padding: '0.6rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.4)',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textAlign: 'center',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        Hearing: {transcript}
                      </div>
                    )}
                  </>
                ) : (
                  // ── Standard / fallback button ──
                  <>
                    <button
                      onClick={enableErrorDetection ? handleManualFinish : onNext}
                      className="btn-primary"
                      style={{ background: 'var(--accent-emerald)', padding: '1.25rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff', fontSize: '0.8rem', letterSpacing: '0.1em' }}
                    >
                      <span>{enableErrorDetection ? 'Finished Reciting' : 'Finished Portion'}</span>
                    </button>
                    <button onClick={() => onLogStumble(chunks[currentChunkIndex][0])} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Log Stumble</button>
                  </>
                )}

                {isListening && !enableErrorDetection && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em', margin: 0 }}>
                    <Mic size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    LISTENING: TURN SWITCHES AFTER SILENCE
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recitation Feedback Card — shown above the control bar */}
      </motion.div>

      {/* ── Retry Prompt Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {retryPrompt && (
          <motion.div
            key="retry-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setRetryPrompt(null); }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{
                width: '100%', maxWidth: '26rem',
                borderRadius: '2rem',
                background: 'var(--bg-secondary, #111118)',
                border: '1px solid rgba(245,158,11,0.25)',
                boxShadow: '0 -4px 48px rgba(0,0,0,0.6)',
                padding: '1.75rem',
                display: 'flex', flexDirection: 'column', gap: '1.25rem',
                marginBottom: '1rem',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '0.875rem', flexShrink: 0,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={16} color="rgba(245,158,11,0.9)" />
                </div>
                <div>
                  <p style={{ fontWeight: '900', fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>Not quite there yet</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.15rem 0 0', fontWeight: '600' }}>
                    {retryPrompt.accuracy !== null ? `${retryPrompt.accuracy}% accuracy · ` : ''}Review and try again
                  </p>
                </div>
              </div>

              {/* Reason list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {retryPrompt.reasons.map((reason, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.12)',
                  }}>
                    <span style={{ color: 'rgba(245,158,11,0.8)', fontSize: '0.7rem', marginTop: '0.05rem', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', lineHeight: 1.4 }}>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  onClick={handleRetryVerse}
                  style={{
                    height: '3.25rem', borderRadius: '1rem',
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(16,185,129,0.2))',
                    border: '1px solid rgba(212,175,55,0.4)',
                    color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.75rem',
                    textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
                <button
                  onClick={handleMarkSatisfied}
                  style={{
                    height: '2.75rem', borderRadius: '1rem',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.65rem',
                    textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    opacity: 0.6,
                    transition: 'all 0.2s',
                  }}
                >
                  <FastForward size={12} />
                  Skip Verse
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Live word overlay ─────────────────────────────────────────────────────────
const WORD_COLORS = {
  correct: { color: 'rgba(16,185,129,0.9)', bg: 'rgba(16,185,129,0.15)' },   // emerald
  substitution: { color: 'rgba(245,158,11,0.95)', bg: 'rgba(245,158,11,0.2)' },  // amber
  omission: { color: 'rgba(239,68,68,0.95)', bg: 'rgba(239,68,68,0.15)' },    // red
  pending: { color: 'rgba(255,255,255,0.3)', bg: 'transparent' },     // dim — not yet reached
};

/**
 * LiveTextOverlay – shows the plain text with a live comparison overlay.
 * The plain text is displayed as the base, and a semi-transparent overlay
 * highlights words based on their recitation status (correct, substitution, omission).
 * 
 * The overlay uses the same word positions as the plain text, applying
 * background colors and text shadows to indicate recitation status.
 */
const LiveTextOverlay = ({ plainText, results, numberInSurah, wordOffset = 0 }) => {
  if (!plainText) return null;

  // Split plain text into words - these are the words to display
  const plainWords = plainText.split(/\s+/).filter(Boolean);

  // The results array has the same number of words as plainWords (minus insertions)
  // We need to map each result to its corresponding plain text word
  // Build a mapping: for each result, find the matching plain text word
  const getWordStatus = (idx) => {
    const globalIdx = idx + wordOffset;
    if (!results || globalIdx >= results.length) return 'pending';
    return results[globalIdx]?.status || 'pending';
  };

  const getSpokenWord = (idx) => {
    const globalIdx = idx + wordOffset;
    if (!results || globalIdx >= results.length) return null;
    return results[globalIdx]?.spokenWord || null;
  };

  return (
    <p
      className="arabic-text"
      style={{
        fontSize: '2.2rem',
        lineHeight: '2.4',
        direction: 'rtl',
        textAlign: 'right',
        wordSpacing: '0.15rem',
        margin: 0,
      }}
    >
      {plainWords.map((word, idx) => {
        const globalIdx = idx + wordOffset;
        const status = getWordStatus(idx);
        const cfg = WORD_COLORS[status] || WORD_COLORS.pending;

        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              marginLeft: '0.3rem',
              color: cfg.color,
              background: cfg.bg,
              borderRadius: '4px',
              fontWeight: status === 'correct' ? '400' : '700',
              textDecoration: status === 'omission' ? 'underline wavy #ef4444' : 'none',
              textShadow: status !== 'pending' ? `0 0 8px ${cfg.color}` : 'none',
              transition: 'all 0.2s',
            }}
            title={status === 'substitution' && getSpokenWord(idx) ? `You said: ${getSpokenWord(idx)}` : undefined}
          >
            {word}
          </span>
        );
      })}
      {numberInSurah && (
        <span style={{
          fontSize: '1.2rem',
          color: 'var(--accent-gold)',
          opacity: 0.5,
          marginRight: '0.5rem',
          transition: 'opacity 0.2s'
        }}>
          ﴿{numberInSurah}﴾
        </span>
      )}
    </p>
  );
};

export default MudarasaView;

