import { motion, AnimatePresence } from 'framer-motion';
import RedBlinkOverlay from './RedBlinkOverlay';
import { ChevronLeft, Mic, WifiOff, RefreshCw, FastForward, BrainCircuit } from 'lucide-react';
import RecitationFeedbackCard from './RecitationFeedbackCard';

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
  recitationResults,  // final comparison shown in feedback card
  transcript,
  onFinishedTurn,
  onClearResults,
}) => {
  // Show feedback card when results are ready and it's (still) the user's turn
  const showFeedback = mudarasaTurn === 'user' && !!recitationResults?.results;

  const handleContinueAfterFeedback = () => {
    onClearResults();
    onNext();
  };

  // Determine live error state
  const hasLiveErrors = enableErrorDetection && mudarasaTurn === 'user' && recitationResults?.results?.some(r => r.status !== 'correct' && r.status !== 'pending');
  // Only show internet banner if STT is enabled but not running at all
  const showInternetBanner = enableErrorDetection && mudarasaTurn === 'user' && !isSttListening && !recitationResults?.results;

  return (
    <>
      {hasLiveErrors && <RedBlinkOverlay active={true} />}
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
          {chunks[currentChunkIndex].map((ayah) => {
            let displayText = ayah.text;
            if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
              const cleanText = displayText.replace(/\uFEFF/g, '');
              const bismillahEnd = "ٱلرَّحِيمِ";
              const bIndex = cleanText.indexOf(bismillahEnd);
              if (bIndex !== -1 && bIndex < 50) {
                displayText = cleanText.substring(bIndex + bismillahEnd.length).trim();
                displayText = displayText.replace(/^[\u200B-\u200D\uFEFF]+/, '');
              }
            }

            const isFirstAyahOfSurah = ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9;
            // Show live overlay when STT is active and we have live results for this ayah
            const showLiveOverlay = enableErrorDetection && isSttListening && liveResults && mudarasaTurn === 'user';

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
                    <LiveWordOverlay
                      results={liveResults.results}
                      numberInSurah={ayah.numberInSurah}
                    />
                  ) : (
                    <p className="arabic-text" style={{ fontSize: '2.2rem', color: ayah.number === currentAyahNumber ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                      {displayText} <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', opacity: 0.5, marginRight: '0.5rem' }}>﴿{ayah.numberInSurah}﴾</span>
                    </p>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', zIndex: 100, display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {mudarasaTurn === 'user' && !showFeedback && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

              {enableErrorDetection && isSttListening ? (
                // ── Auto-detect mode: animated listening pill ──
                <>
                  <motion.div
                    animate={{ scale: [1, 1.04, 1], boxShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 18px rgba(16,185,129,0.5)', '0 0 0px rgba(16,185,129,0)'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
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
                    <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: '600' }}>Stops when you go quiet</span>
                  </motion.div>
                  <button
                    onClick={onFinishedTurn}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                  >
                    Tap to finish early
                  </button>
                </>
              ) : (
                // ── Standard / fallback button ──
                <>
                  <button
                    onClick={enableErrorDetection ? onFinishedTurn : onNext}
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
      {showFeedback && (
        <RecitationFeedbackCard
          results={recitationResults?.results}
          insertions={recitationResults?.insertions}
          breakdown={recitationResults?.breakdown}
          chunk={chunks[currentChunkIndex]}
          transcript={transcript}
          onContinue={handleContinueAfterFeedback}
          onLogStumble={onLogStumble}
        />
      )}
    </motion.div>
  </>
  );
};

// ── Live word overlay ─────────────────────────────────────────────────────────
const WORD_COLORS = {
  correct:      { color: '#10b981', glow: 'rgba(16,185,129,0.3)' },   // emerald
  substitution: { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },  // amber
  omission:     { color: '#ef4444', glow: 'rgba(239,68,68,0.2)' },    // red
  pending:      { color: 'rgba(255,255,255,0.25)', glow: 'none' },     // dim — not yet reached
};

const LiveWordOverlay = ({ results }) => {
  if (!results || results.length === 0) return null;
  return (
    <p
      className="arabic-text"
      style={{
        fontSize: '2.2rem',
        lineHeight: '2.4',
        direction: 'rtl',
        textAlign: 'right',
        wordSpacing: '0.15rem',
      }}
    >
      {results.map((item, idx) => {
        const cfg = WORD_COLORS[item.status] || WORD_COLORS.pending;
        return (
          <motion.span
            key={idx}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1, color: cfg.color }}
            transition={{ duration: 0.25 }}
            title={item.status === 'substitution' && item.spokenWord ? `You said: ${item.spokenWord}` : undefined}
            style={{
              display: 'inline-block',
              marginLeft: '0.3rem',
              color: cfg.color,
              textShadow: item.status !== 'pending' ? `0 0 12px ${cfg.glow}` : 'none',
              textDecoration: item.status === 'omission' ? 'underline wavy #ef4444' : 'none',
              transition: 'color 0.3s, text-shadow 0.3s',
              fontWeight: item.status === 'correct' ? '400' : '700',
            }}
          >
            {item.word}
          </motion.span>
        );
      })}
    </p>
  );
};

export default MudarasaView;

