import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecitationStatusOverlay from './RedBlinkOverlay';
import { Mic, CheckCircle2 } from 'lucide-react';
import { hasBismillahHeader, BISMILLAH_SIMPLE, removeTashkeel, normalizeArabic, expandMuqattaat } from '../utils/quranUtils';

// New Extracted Components & Hooks, Alhamdulillah
import { MudarasaHeader } from './mudarasa/MudarasaHeader';
import { AudioErrorModal } from './mudarasa/AudioErrorModal';
import { RetryPrompt } from './mudarasa/RetryPrompt';
import { AyahCard } from './mudarasa/AyahCard';
import { useActiveVerseIndex } from './mudarasa/hooks/useActiveVerseIndex';
import { useFeedbackDebounce } from './mudarasa/hooks/useFeedbackDebounce';

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
   enableErrorDetection,
   isSttListening,
   liveResults,
   transcript,
   onFinishedTurn,
   onRetryTurn,
   /**
    * Bumped by PartnerSession when the recogniser decides the user has recited
    * to the end of the portion and gone quiet. Drives `handleManualFinish`,
    * which is the only path that can end a Smart Mode turn on the user's own
    * initiative — see the effect below.
    */
   turnSettledToken = 0,
   quranSimple,
   targetAccuracy,
   retryStartIndex = 0,
   setRetryStartIndex,
   completedResults,
   isHintActive,
   modelStatus,
 }) => {
  const [showText, setShowText] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_show_text') ?? 'true'); } catch { return true; }
  });

  useEffect(() => {
    localStorage.setItem('quran_musaffa_show_text', JSON.stringify(showText));
  }, [showText]);

  const {
    sliceActiveAyahIndex,
    activeAyahIndex,
    activeVerseWordOffset,
    activeStat,
  } = useActiveVerseIndex(
    enableErrorDetection,
    liveResults,
    chunks,
    currentChunkIndex,
    retryStartIndex,
    quranSimple,
    targetAccuracy
  );

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

  /**
   * The finish check: advance when the final verse met the target, otherwise
   * put the shortfall in front of the user instead of hiding it.
   *
   * This existed but could never run. It was only ever wired to the
   * "Finished Reciting" button, and that button lives in the `else` branch of
   * the control-bar ternary below — the branch that is unreachable whenever
   * `enableErrorDetection` is true, which is exactly when this function is
   * needed. So Smart Mode had no completion path at all except bypassing the
   * check outright with "Mark Satisfied".
   */
  const handleManualFinish = () => {
    if (!enableErrorDetection) {
      onFinishedTurn();
      return;
    }

    if (!liveResults || !liveResults.verseStats || liveResults.verseStats.length === 0) {
      setRetryPrompt({ reasons: ['No recitation was detected — please recite the verse.'], accuracy: null });
      return;
    }

    // Check the verse the user actually finished on. `sliceActiveAyahIndex` is
    // derived from the scoring state and is clamped to the last verse once the
    // whole portion has been recited, which is precisely the verse to judge.
    const stat = liveResults.verseStats[sliceActiveAyahIndex];
    const reasons = [];

    if (!stat) {
      reasons.push('Please recite the current verse.');
    } else {
      if (stat.hasPending) reasons.push('Not all words of the current verse were read.');
      if (stat.accuracy < targetAccuracy) {
        reasons.push(`Accuracy for the current verse is below target (${stat.accuracy}% / ${targetAccuracy}%)`);
      }
    }

    if (reasons.length > 0) {
      setRetryPrompt({ reasons, accuracy: stat ? stat.accuracy : null });
    } else {
      handleMarkSatisfied();
    }
  };

  /**
   * Run the finish check whenever the recogniser reports the turn has settled.
   *
   * The previous token is tracked explicitly because the effect also depends on
   * `mudarasaTurn`: without the diff, every 'app' -> 'user' handover would
   * re-run it and open the retry prompt at the very *start* of a turn, before
   * the user had recited anything. `retryPrompt` is a dependency too, so
   * opening the prompt re-runs the effect harmlessly (the token no longer
   * differs) rather than stacking a second one.
   */
  const lastSettledTokenRef = useRef(turnSettledToken);
  useEffect(() => {
    if (turnSettledToken === lastSettledTokenRef.current) return;
    lastSettledTokenRef.current = turnSettledToken;
    if (turnSettledToken === 0) return;
    if (mudarasaTurn !== 'user') return;
    if (retryPrompt) return;
    // This is not a derived-state effect. It is the reaction to an event the
    // recogniser raised from outside React, which reached us as a prop. The
    // token-diff guard above makes it fire exactly once per settle, so the
    // resulting state change is the intended output rather than a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleManualFinish();
    // `handleManualFinish` is deliberately not a dependency: the token is the
    // trigger, and it reads live scoring state at the moment it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnSettledToken, mudarasaTurn, retryPrompt]);

  const flashError = useFeedbackDebounce(enableErrorDetection, liveResults, mudarasaTurn);
  const overlayMode = flashError ? 'error' : null;

  const transcriptRef = useRef(null);
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  const activeAyahIdRef = useRef(null);
  useEffect(() => {
    if (mudarasaTurn === 'user' && activeAyahIdRef.current) {
      const el = document.getElementById(activeAyahIdRef.current);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isOutsideView = rect.top < 150 || rect.bottom > (window.innerHeight - 200);
        if (isOutsideView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // const showInternetBanner = enableErrorDetection && mudarasaTurn === 'user' && !isSttListening;

  return (
    <>
      <RecitationStatusOverlay mode={overlayMode} />
      {/* {showInternetBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, padding: '0.5rem 1rem',
          background: 'rgba(255,165,0,0.2)', borderBottom: '1px solid rgba(255,165,0,0.5)',
          color: '#fff', textAlign: 'center', zIndex: 300, fontWeight: '600'
        }}>
          Smart Error Detection requires internet (Web Speech API)
        </div>
      )} */}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
         <MudarasaHeader
           onBack={onBack}
           mudarasaTurn={mudarasaTurn}
           currentChunkIndex={currentChunkIndex}
           chunksLength={chunks.length}
           showText={showText}
           setShowText={setShowText}
           enableErrorDetection={enableErrorDetection}
           isSttListening={isSttListening}
           isListening={isListening}
           currentVolume={currentVolume}
           sensitivity={sensitivity}
            modelStatus={modelStatus}
            isPaused={isPaused}
            onPause={onPause}
            onResume={onResume}
          />

        {/* Rendered only once `playAyahAudioAsync` has exhausted its retries, so
            a genuine outage explains itself and offers Retry / Skip rather than
            leaving the session silently sitting paused with no reason shown. */}
        <AudioErrorModal
          audioError={audioError}
          setAudioError={setAudioError}
          onResume={onResume}
          onNext={onNext}
        />

        <div style={{ flex: 1, padding: '1rem 0 6rem 0' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {chunks[currentChunkIndex]?.map((ayah, idx) => {
              let displayText = ayah.text;
              if (enableErrorDetection && quranSimple) {
                const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
                if (quranSimple[key]) displayText = quranSimple[key];
              }

              if (hasBismillahHeader(ayah.surahNumber, ayah.numberInSurah)) {
                if (displayText.startsWith(BISMILLAH_SIMPLE)) {
                  displayText = displayText.slice(BISMILLAH_SIMPLE.length).trim();
                }
              }

              const isFirstAyahOfSurah = ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9;
              const isCompleted = enableErrorDetection && idx < activeAyahIndex;
              const isActive = !enableErrorDetection || idx === activeAyahIndex;
              const isLocked = enableErrorDetection && idx > activeAyahIndex;

              // Live word-by-word coloring is gated on the TURN and on Smart
              // Mode being active — NOT on `isSttListening`.
              //
              // `isSttListening` drops to false on every `onend`/`onspeechend`
              // the Web Speech API fires, which happens between every verse. Gating
              // the live overlay on it made the word-by-word coloring die after the
              // first verse: the chip flipped to "Restarting..." and only the
              // completed-verse one-pass coloring kept working, even though the
              // recogniser was still running (it auto-restarts via `_shouldRestart`).
              // The chip and overlay were reporting a transient mic state instead of
              // the real mode. What actually defines "we're live" is that it is the
              // user's turn and Smart Mode is on — both are stable across the whole
              // turn, so the overlay now stays on until the turn hands over.
              const showLiveOverlay = enableErrorDetection && liveResults && mudarasaTurn === 'user' && isActive;
              const showCompletedOverlay = enableErrorDetection && isCompleted && (completedResults || liveResults);

              if (isActive) {
                activeAyahIdRef.current = `mudarasa-ayah-${ayah.number}`;
              }

              const wordOffset = (() => {
                if (idx === sliceActiveAyahIndex) return activeVerseWordOffset;
                let offset = 0;
                const sliceChunk = chunks[currentChunkIndex].slice(retryStartIndex);
                for (let i = 0; i < idx - retryStartIndex; i++) {
                  const a = sliceChunk[i];
                  if (!a) continue;
                  let txt = a.text || '';
                  if (quranSimple) {
                    const key = `${a.surahNumber}|${a.numberInSurah}`;
                    if (quranSimple[key]) txt = quranSimple[key];
                  }
                  let combined;
                  if (hasBismillahHeader(a.surahNumber, a.numberInSurah)) {
                    const bodyText = txt.startsWith(BISMILLAH_SIMPLE) ? txt.slice(BISMILLAH_SIMPLE.length).trim() : txt;
                    combined = normalizeArabic(BISMILLAH_SIMPLE) + ' ' + normalizeArabic(expandMuqattaat(removeTashkeel(bodyText)));
                  } else {
                    combined = normalizeArabic(expandMuqattaat(removeTashkeel(txt)));
                  }
                  offset += combined.trim().split(/\s+/).filter(Boolean).length;
                }
                return offset;
              })();

              return (
                <AyahCard
                  key={ayah.number}
                  ayah={ayah}
                  currentAyahNumber={currentAyahNumber}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  showText={showText}
                  isFirstAyahOfSurah={isFirstAyahOfSurah}
                  showLiveOverlay={showLiveOverlay}
                  showCompletedOverlay={showCompletedOverlay}
                  displayText={displayText}
                  results={showCompletedOverlay ? (completedResults?.results || liveResults?.results) : liveResults?.results}
                  wordOffset={wordOffset} 
                />
              );
            })}
          </div>
        </div>

        {/* Control Bar */}
        <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', zIndex: 'var(--z-header)', display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {mudarasaTurn === 'user' && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                {/* Keyed on the MODE, not on `isSttListening`.
                    `handleFinishedTurn` in PartnerSession calls `stopAndCheck()`
                    and then advances the chunk ~200ms later, which takes
                    `isSttListening` false for that whole window while the turn
                    is still 'user'. Testing it here made the smart-mode controls
                    briefly disappear and the hands-free "Finished Reciting"
                    button take their place — a mode flip that never happened.
                    Smart mode is still smart mode while the mic restarts. */}
                {(enableErrorDetection || isHintActive) ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleMarkSatisfied}
                          style={{
                            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                            border: '1px solid rgba(16,185,129,0.3)',
                            background: 'rgba(16,185,129,0.08)',
                            color: 'var(--accent-emerald)', fontWeight: '800', fontSize: 'var(--fs-label)',
                            textTransform: 'uppercase', letterSpacing: 'var(--tracking-status)',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            transition: 'all 0.2s',
                          }}
                        >
                          <CheckCircle2 size={10} /> Mark Satisfied
                        </button>
                      </div>
                      {activeStat && (
                        <span style={{ color: activeStat.accuracy < targetAccuracy ? 'rgba(245,158,11,0.8)' : 'var(--accent-emerald)', opacity: 0.9, fontWeight: '800', fontSize: 'var(--fs-label)' }}>
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
                          fontSize: 'var(--fs-secondary)',
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
                  <>
                    <button
                      onClick={enableErrorDetection ? handleManualFinish : onNext}
                      className="btn-primary"
                      style={{ background: 'var(--accent-emerald)', padding: '1.25rem 2.5rem', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: '#fff', fontSize: 'var(--fs-body-sm)', letterSpacing: '0.1em' }}
                    >
                      <span>{enableErrorDetection ? 'Finished Reciting' : 'Finished Portion'}</span>
                    </button>
                    <button onClick={() => onLogStumble(chunks[currentChunkIndex][0])} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.5, fontWeight: '700', fontSize: 'var(--fs-label)', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Log Stumble</button>
                  </>
                )}
                {isListening && !enableErrorDetection && (
                  <p style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em', margin: 0 }}>
                    <Mic size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    LISTENING: TURN SWITCHES AFTER SILENCE
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <RetryPrompt 
        retryPrompt={retryPrompt} 
        setRetryPrompt={setRetryPrompt} 
        handleRetryVerse={handleRetryVerse} 
        handleMarkSatisfied={handleMarkSatisfied} 
      />
    </>
  );
};

export default MudarasaView;
