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
    <div style={{ position: 'sticky', top: 'calc(var(--control-md-h) + var(--space-4) + 1px)', zIndex: 'var(--z-sticky)', padding: '1rem 0' }}>
      {/* Offset by the global header's rendered height so this bar parks directly
          beneath it at every viewport: `--control-md-h` (36px, 42px from 640px up)
          + `py-2` (--space-4) + the 1px hairline border. The previous fixed 70px
          left a 19px/11px gap that also ignored the 14px mobile root. */}
      <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Deliberately .icon-btn-sm: sub-page header, tighter tap target than the global header. */}
          <button onClick={onBack} className="icon-btn icon-btn-sm"><ChevronLeft size={16} /></button>
          <div>
            <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-strong)', color: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {mudarasaTurn === 'app' ? 'Listen' : 'Recite'}
            </span>
            <p style={{ fontSize: 'var(--fs-secondary)', fontWeight: '700', color: 'var(--text-primary)' }}>Portion {currentChunkIndex + 1} of {chunksLength}</p>
          </div>
        </div>
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
          {enableErrorDetection && mudarasaTurn === 'user' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)',
              background: isSttListening ? 'rgba(16,185,129,0.15)' : 'var(--bg-accent)',
              border: `1px solid ${isSttListening ? 'rgba(16,185,129,0.4)' : 'var(--glass-border)'}`,
              transition: 'all 0.3s',
            }}>
              <BrainCircuit size={12} color={isSttListening ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
               <span style={{ fontSize: 'var(--fs-micro)', fontWeight: '800', color: isSttListening ? 'var(--accent-emerald)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-status)' }}>
                 {modelStatus === 'installing' || modelStatus === 'needs_install'
                   ? 'Installing Model...'
                   : isSttListening
                     ? (!isOnline ? 'Checking (Offline)' : 'Checking')
                     : 'Ready'
                 }
               </span>
            </div>
          )}
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
  );
};
