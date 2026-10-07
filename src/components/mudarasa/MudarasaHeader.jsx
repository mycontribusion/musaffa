import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, BookX, BrainCircuit, Play, Pause } from 'lucide-react';

export const MudarasaHeader = ({
   onBack,
   mudarasaTurn,
   currentChunkIndex,
   chunksLength,
   showText,
   setShowText,
   enableErrorDetection,
   isSttListening,
   isListening,
   currentVolume,
   sensitivity,
   modelStatus = 'idle',
   isPaused = false,
   onPause,
   onResume
 }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    /* Top-level header, built to the same spec as every other standalone header
       in the app (SurahDetail, WeaknessTracker, AudioManager, MutashabihSelection,
       MutashabihatSession) so the bar is interchangeable as you move between
       views:

         - full-bleed (`100vw` + centred negative margin) so the background and
           the `var(--border-hairline)` bottom rule span the whole viewport,
         - `--bg-primary` fill, no card chrome — the previous `.glass-card`
           wrapper (border, radius, blur, `margin: 1rem 0`) is gone, which is
           what made this bar both taller and visually distinct from its siblings,
         - `sticky` at `top: 0`, `z-header` (100),
         - inner `.app-container` restoring the standard page gutter, holding a
           `flex items-center justify-between py-2` row with a 44px `.icon-btn`,
         - total height `py-2` (16px) + the 44px row + the 1px hairline = 61px,
           identical to the other headers, so content below the bar does not
           shift when entering or leaving the session.

       Note the row holds three children, not two: `justify-between` spreads the
       back button, the counter and the controls across the full width, which is
       what centres the counter the same way SurahDetail centres its title.

       `flexShrink: 0` is required because MudarasaView is a flex column and the
       ayah list would otherwise compress the bar.

       The "Listen"/"Recite" turn label was removed: the header now carries only
       the back control and the `x/x` portion counter. Turn state is still
       communicated by the two status dots on the right, which recolour gold
       (app's turn) and emerald (user's turn) from the same `mudarasaTurn`. */
    <div style={{
      position: 'sticky', top: 0, zIndex: 'var(--z-header)',
      width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
      backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)',
    }}>
      <div className="app-container">
        <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          <button onClick={onBack} className="icon-btn" title="Back to Musaffa config"><ChevronLeft size={18} /></button>
          {/* Compact `3/12` counter at `--fs-page` — the same token and weight
              the Surah Detail and Mistake Book headers use for their titles. */}
          <p style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', margin: 0 }}>{currentChunkIndex + 1}/{chunksLength}</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {/* Session Pause/Resume — driven by the same isPaused/pauseMusaffa/
              resumeMusaffa state the global header used to control. */}
          <button
            onClick={isPaused ? onResume : onPause}
            title={isPaused ? 'Resume recitation' : 'Pause recitation'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: 'var(--radius-full)', cursor: 'pointer',
              border: `1px solid ${isPaused ? 'rgba(212,175,55,0.4)' : 'var(--glass-border)'}`,
              background: isPaused ? 'var(--accent-gold-soft)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {isPaused
              ? <Play size={13} color="var(--accent-gold)" />
              : <Pause size={13} color="var(--text-muted)" />}
            <span style={{
              fontSize: 'var(--fs-micro)', fontWeight: '800', letterSpacing: 'var(--tracking-status)',
              textTransform: 'uppercase',
              color: isPaused ? 'var(--accent-gold)' : 'var(--text-secondary)',
              transition: 'color 0.2s',
            }}>
              {isPaused ? 'Resume' : 'Pause'}
            </span>
          </button>
          <button
            onClick={() => setShowText(!showText)}
            title={showText ? 'Hide text' : 'Show text'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: 'var(--radius-full)', cursor: 'pointer',
              border: `1px solid ${showText ? 'var(--glass-border)' : 'rgba(212,175,55,0.4)'}`,
              background: showText ? 'transparent' : 'var(--accent-gold-soft)',
              transition: 'all 0.2s',
            }}
          >
            {showText
              ? <BookOpen size={13} color="var(--text-muted)" />
              : <BookX size={13} color="var(--accent-gold)" />}
            <span style={{
              fontSize: 'var(--fs-micro)', fontWeight: '800', letterSpacing: 'var(--tracking-status)',
              textTransform: 'uppercase',
              color: showText ? 'var(--text-secondary)' : 'var(--accent-gold)',
              transition: 'color 0.2s',
            }}>
              Text
            </span>
          </button>
          {/* Smart Mode status chip. Renders only in Smart Mode and only on the
              user's turn, so its absence on the app's turn is itself the signal
              that scoring is paused. It shows ONE steady state for the whole
              turn — it no longer flips to "Restarting..." between verses.
              
              That transient label was an implementation detail of the Web Speech
              API: the recogniser fires `onend`/`onspeechend` between verses and
              auto-restarts a moment later. Showing it just flickered the chip
              and, worse, was the same flag the live word-by-word overlay used to
              gate on — which is what killed the per-verse coloring after the
              first verse. The overlay is now gated on the turn instead (see
              MudarasaView), so the chip has nothing useful left to say about the
              mic's internal restarts and is reduced to the single steady label.
              
              `modelStatus` is deliberately NOT the primary key: it is only ever
              driven to 'ready' on native Android (the Vosk path). On web the
              recogniser is `window.SpeechRecognition` and the flag stays 'idle'
              forever, so a model-based label here would sit on a stale word
              instead of describing what the user is experiencing. */}
          {enableErrorDetection && mudarasaTurn === 'user' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.4)',
            }}>
              <BrainCircuit size={12} color="var(--accent-emerald)" />
               <span style={{ fontSize: 'var(--fs-micro)', fontWeight: '800', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-status)' }}>
                 {modelStatus === 'installing' || modelStatus === 'needs_install'
                   ? 'Installing Model...'
                   : (!isOnline ? 'Checking (Offline)' : 'Checking')
                 }
               </span>
            </div>
         )}
          {/* `isSttListening` is intentionally no longer consumed here. It was
              only ever used to drive the transient "Restarting..." label, which
              served no purpose once the live overlay stopped gating on it. */}
         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', boxShadow: mudarasaTurn === 'app' ? '0 0 10px var(--accent-gold)' : 'none' }} />
         <div style={{
           width: '8px', height: '8px', borderRadius: '50%',
           background: mudarasaTurn === 'user'
             ? (isListening ? (currentVolume > sensitivity ? 'var(--accent-emerald)' : 'var(--glass-border)') : 'var(--accent-emerald)')
             : 'var(--bg-accent)',
           boxShadow: mudarasaTurn === 'user'
             ? (isListening ? (currentVolume > sensitivity ? '0 0 10px var(--accent-emerald)' : 'none') : '0 0 10px var(--accent-emerald)')
             : 'none',
           transition: 'all 0.1s'
         }} />
       </div>
       </div>
     </div>
   </div>
 );
};
