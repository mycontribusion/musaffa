import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecitationStatusOverlay from './RedBlinkOverlay';
import { Mic, CheckCircle2 } from 'lucide-react';
import { hasBismillahHeader, BISMILLAH_SIMPLE, removeTashkeel, normalizeArabic, expandMuqattaat } from '../utils/quranUtils';

// New Extracted Components & Hooks
import { MudarasaHeader } from './mudarasa/MudarasaHeader';
// import { AudioErrorModal } from './mudarasa/AudioErrorModal';
import { RetryPrompt } from './mudarasa/RetryPrompt';
import { AyahCard } from './mudarasa/AyahCard';
import { useActiveVerseIndex } from './mudarasa/hooks/useActiveVerseIndex';
import { useFeedbackDebounce } from './mudarasa/hooks/useFeedbackDebounce';
import { MicStatusIndicator } from './MicStatusIndicator';

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
  onClearResults,
  quranSimple,
  targetAccuracy,
  retryStartIndex = 0,
  setRetryStartIndex,
  completedResults,
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

  const handleManualFinish = () => {
    if (!enableErrorDetection) {
      onFinishedTurn();
      return;
    }

    if (!liveResults || !liveResults.verseStats || liveResults.verseStats.length === 0) {
      setRetryPrompt({ reasons: ['No recitation was detected — please recite the verse.'], accuracy: null });
      return;
    }

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

      {/* Subtle Toast Notification for Audio Errors */}
      {audioError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-full shadow-sm animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          Audio failed to load. Retrying playback...
        </div>
      )}

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
        />

        <div style={{ flex: 1, padding: '1rem 0 6rem 0' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
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

              const showLiveOverlay = enableErrorDetection && isSttListening && liveResults && mudarasaTurn === 'user' && isActive;
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
        <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', zIndex: 100, display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {mudarasaTurn === 'user' && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                {enableErrorDetection && isSttListening ? (
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
                  <MicStatusIndicator>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em', margin: 0 }}>
                      <Mic size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      LISTENING: TURN SWITCHES AFTER SILENCE
                    </p>
                  </MicStatusIndicator>
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
