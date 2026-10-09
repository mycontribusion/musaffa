import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, BookX, Play, Pause } from 'lucide-react';

export const MudarasaHeader = ({
   onBack,
   mudarasaTurn,
   currentChunkIndex,
   chunksLength,
   showText,
   setShowText,
   enableErrorDetection,
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

   /* Dot 2 encodes Smart Mode status as colour when error detection is on:
      green = checking (STT active), orange = installing model, red = offline.
      In hands-free mode the existing volume-pulsing behaviour is preserved. */
   let dot2Bg, dot2Glow;
   if (mudarasaTurn === 'user') {
     if (enableErrorDetection) {
       if (modelStatus === 'installing' || modelStatus === 'needs_install') {
         dot2Bg = 'var(--accent-gold)';
         dot2Glow = '0 0 10px var(--accent-gold)';
       } else if (!isOnline) {
         dot2Bg = 'var(--accent-red)';
         dot2Glow = '0 0 10px var(--accent-red)';
       } else {
         dot2Bg = 'var(--accent-emerald)';
         dot2Glow = '0 0 10px var(--accent-emerald)';
       }
     } else {
       if (isListening) {
         if (currentVolume > sensitivity) {
           dot2Bg = 'var(--accent-emerald)';
           dot2Glow = '0 0 10px var(--accent-emerald)';
         } else {
           dot2Bg = 'var(--glass-border)';
           dot2Glow = 'none';
         }
       } else {
         dot2Bg = 'var(--accent-emerald)';
         dot2Glow = '0 0 10px var(--accent-emerald)';
       }
     }
   } else {
     dot2Bg = 'var(--bg-accent)';
     dot2Glow = 'none';
   }

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
        communicated by the two status dots on the right: Dot 1 is gold during
        the app's turn and grey during the user's turn; Dot 2 is green during the
        user's turn (with volume-pulsing in hands-free mode) and additionally
        encodes Smart Mode status as colour — orange for installing, red for
        offline — so no text chip is needed. */
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
          {/* Smart Mode status is now encoded as colour on Dot 2 below
              (green = checking, orange = installing, red = offline) instead
              of a text chip, keeping the header compact on the user's turn. */}
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', boxShadow: mudarasaTurn === 'app' ? '0 0 10px var(--accent-gold)' : 'none' }} />
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: dot2Bg,
            boxShadow: dot2Glow,
            transition: 'all 0.1s'
          }} />
       </div>
       </div>
     </div>
   </div>
 );
};
