import { ChevronLeft, BookOpen, BookX, BrainCircuit } from 'lucide-react';

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
  sensitivity
}) => {
  return (
    <div style={{ position: 'sticky', top: '70px', zIndex: 90, padding: '1rem 0' }}>
      <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="icon-btn" style={{ width: '32px', height: '32px' }}><ChevronLeft size={16} /></button>
          <div>
            <span style={{ fontSize: '0.55rem', fontWeight: '900', color: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {mudarasaTurn === 'app' ? 'Listen' : 'Recite'}
            </span>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Portion {currentChunkIndex + 1} of {chunksLength}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowText(!showText)}
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
  );
};
