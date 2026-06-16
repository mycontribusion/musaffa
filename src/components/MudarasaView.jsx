import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecitationStatusOverlay from './RedBlinkOverlay';
import { ChevronLeft, Mic, WifiOff, RefreshCw, FastForward, BrainCircuit, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
}) => {

  // ── Retry prompt state ─────────────────────────────────────────────────────
  // null = hidden; object = visible with failure reasons
  const [retryPrompt, setRetryPrompt] = useState(null);

  // Called by both "Finished Reciting" and "Tap to finish early" buttons.
  // If error detection is on and criteria aren't met, show the retry prompt
  // instead of advancing. If all criteria pass, proceed immediately.
  const handleManualFinish = () => {
    if (!enableErrorDetection) {
      onFinishedTurn();
      return;
    }

    // No STT data at all — user tapped before speaking
    if (!liveResults || !liveResults.results || liveResults.results.length === 0) {
      setRetryPrompt({ reasons: ['No recitation was detected — please recite the verse.'], accuracy: null });
      return;
    }

    const { preBlockHasPending, preBlockAccuracy, smartAnchorHit } = liveResults;
    const reasons = [];

    if (preBlockHasPending)
      reasons.push('Not all words were read — continue to the end of the verse');
    if (preBlockAccuracy < 50)
      reasons.push(`Accuracy too low (${preBlockAccuracy}% — minimum 50% required)`);
    else if (preBlockAccuracy < targetAccuracy)
      reasons.push(`Below your accuracy goal (${preBlockAccuracy}% — need ${targetAccuracy}%)`);
    if (!smartAnchorHit)
      reasons.push('The last word of the verse was not recited correctly');

    if (reasons.length > 0) {
      setRetryPrompt({ reasons, accuracy: preBlockAccuracy });
    } else {
      onFinishedTurn();
    }
  };

  // Derive overlay mode from live results for hands-free feedback
  // Only show overlay during user's recitation turn, not when app is playing
  let overlayMode = null;
  if (enableErrorDetection && mudarasaTurn === 'user' && isSttListening && liveResults?.results?.length > 0) {
    const hasError = liveResults.results.some(
      r => r.status === 'omission' || r.status === 'substitution'
    );
    if (hasError) {
      overlayMode = 'error';
    }
  }

  // Vibrate when a new error is detected
  const prevErrorCountRef = useRef(0);
  useEffect(() => {
    if (!enableErrorDetection || !liveResults?.results) {
      prevErrorCountRef.current = 0;
      return;
    }
    const currentErrors = liveResults.results.filter(
      r => r.status === 'omission' || r.status === 'substitution'
    ).length;
    if (currentErrors > prevErrorCountRef.current) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
    prevErrorCountRef.current = currentErrors;
  }, [liveResults, enableErrorDetection]);

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
                {mudarasaTurn === 'app' ? 'Listening to Partner' : 'Your Turn to Recite'}
              </span>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Portion {currentChunkIndex + 1} of {chunks.length}</p>
            </div>
          </div>
           <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

      {/* Audio Error Banner */}
      {audioError && (
        <div style={{ maxWidth: '800px', margin: '1rem auto', padding: '0 1rem', width: '100%' }}>
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-red)' }}>
              <WifiOff size={24} />
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audio Missing Offline</h3>
                <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', opacity: 0.9 }}>
                  Connect to the internet to stream, or manually skip the App's turn.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setAudioError(false); onNext(); }}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-red)',
                  background: 'var(--accent-red)', color: '#fff', fontSize: '0.75rem', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <FastForward size={14} /> Skip Turn
              </button>
              <button
                onClick={() => { setAudioError(false); onResume(); }}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
                  background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

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

            let cumulativeWordCount = 0;
            return chunks[currentChunkIndex].map((ayah) => {
              // Use quranSimple plain text for error detection when available
              let displayText = ayah.text;
              if (enableErrorDetection && quranSimple) {
                const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
                const simpleText = quranSimple[key];
                if (simpleText) {
                  displayText = simpleText;
                }
              }
              
              if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
                const cleanText = displayText.replace(/\uFEFF/g, '');
                const bismillahEnd = "ٱلرَّحِيمِ";
                const plainBismillahEnd = "بسم الله الرحمن الرحيم";
                
                const bIndex = cleanText.indexOf(bismillahEnd);
                const bIndexPlain = cleanText.indexOf(plainBismillahEnd);
                
                const originalWordCount = cleanText.split(/\s+/).filter(Boolean).length;
                let stripped = false;
                
                if (bIndex !== -1 && bIndex < 50) {
                  displayText = cleanText.substring(bIndex + bismillahEnd.length).trim();
                  displayText = displayText.replace(/^[\u200B-\u200D\uFEFF]+/, '');
                  stripped = true;
                } else if (bIndexPlain !== -1 && bIndexPlain < 50) {
                  displayText = cleanText.substring(bIndexPlain + plainBismillahEnd.length).trim();
                  stripped = true;
                }
                
                if (stripped) {
                  const newWordCount = displayText.split(/\s+/).filter(Boolean).length;
                  cumulativeWordCount += (originalWordCount - newWordCount);
                }
              }

              const isFirstAyahOfSurah = ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9;
              // Show live overlay when STT is active and we have live results for this ayah
              const showLiveOverlay = enableErrorDetection && isSttListening && liveResults && mudarasaTurn === 'user';
              
              const currentOffset = cumulativeWordCount;
              cumulativeWordCount += displayText.split(/\s+/).filter(Boolean).length;
              
              const isActiveAyah = enableErrorDetection && lastSpokenIdx >= currentOffset && lastSpokenIdx < cumulativeWordCount;
              if (isActiveAyah) {
                activeAyahIdRef.current = `mudarasa-ayah-${ayah.number}`;
              }

              return (
                <div key={ayah.number} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {isFirstAyahOfSurah && (
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
                    animate={{ opacity: 1, scale: ayah.number === currentAyahNumber ? 1.02 : 1 }}
                    style={{
                      textAlign: 'right', padding: '1.5rem', borderRadius: '1.5rem',
                      background: ayah.number === currentAyahNumber ? 'var(--accent-gold-soft)' : 'transparent',
                      border: ayah.number === currentAyahNumber ? '1px solid var(--accent-gold-soft)' : '1px solid transparent',
                      transition: '0.4s'
                    }}
                  >
                    {showLiveOverlay ? (
                        <LiveTextOverlay
                          plainText={displayText}
                          results={liveResults.results}
                          numberInSurah={ayah.numberInSurah}
                          wordOffset={currentOffset}
                        />
                      ) : (
                       <p className="arabic-text" style={{ fontSize: '2.2rem', color: ayah.number === currentAyahNumber ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                         {displayText} <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', opacity: 0.5, marginRight: '0.5rem' }}>﴿{ayah.numberInSurah}﴾</span>
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
                // ── Auto-detect mode: static listening pill (no green animation) ──
                <>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '1rem 2rem', borderRadius: '999px',
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: 'var(--accent-emerald)',
                    }}
                  >
                    <Mic size={16} />
                    <span style={{ fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Listening…</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: '600' }}>Stops when you finish reading</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={handleManualFinish}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                    >
                      Tap to finish early
                    </button>
                    {liveResults?.preBlockAccuracy !== undefined && (
                      <span style={{ color: 'var(--accent-gold)', opacity: 0.8, fontWeight: '800', fontSize: '0.65rem' }}>• {liveResults.preBlockAccuracy}% / {targetAccuracy}%</span>
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
                  onClick={() => {
                    setRetryPrompt(null);
                    if (onRetryTurn) onRetryTurn();
                  }}
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
                  onClick={() => {
                    setRetryPrompt(null);
                    onFinishedTurn();
                  }}
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
                  Skip Anyway
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
  correct:      { color: 'rgba(16,185,129,0.9)', bg: 'rgba(16,185,129,0.15)' },   // emerald
  substitution: { color: 'rgba(245,158,11,0.95)', bg: 'rgba(245,158,11,0.2)' },  // amber
  omission:     { color: 'rgba(239,68,68,0.95)', bg: 'rgba(239,68,68,0.15)' },    // red
  pending:      { color: 'rgba(255,255,255,0.3)', bg: 'transparent' },     // dim — not yet reached
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

