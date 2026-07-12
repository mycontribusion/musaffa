import { Mic, BrainCircuit, Hand } from 'lucide-react';

/**
 * SessionModeSelector — Manual Tap / Hands-Free / Smart Detection mode picker.
 */
export const SessionModeSelector = ({ params, onChange, sttSupported, modeRef }) => {
  const sectionLabel = {
    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
  };

  const isManual = !params.autoNext && !params.errorDetection;
  const isHandsFree = params.autoNext && !params.errorDetection;
  const isSmart = params.autoNext && params.errorDetection;

  const ModeCard = ({ isActive, onClick, cardRef, icon, title, description, activeColor = 'var(--accent-gold)', activeBg = 'var(--accent-gold-soft)', activeDotBg = '#000' }) => (
    <button
      ref={isActive ? cardRef : null}
      onClick={onClick}
      style={{
        minWidth: '240px', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.9rem 1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
        background: isActive ? activeBg : 'var(--bg-accent)',
        border: '1px solid', borderColor: isActive ? activeColor : 'var(--glass-border)',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? activeColor : 'rgba(255,255,255,0.05)',
        color: isActive ? activeDotBg : 'var(--text-muted)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '800', fontSize: '0.8rem', color: isActive ? activeColor : 'var(--text-primary)' }}>{title}</p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%', border: '2px solid',
        borderColor: isActive ? activeColor : 'var(--glass-border)',
        background: isActive ? activeColor : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeDotBg }} />}
      </div>
    </button>
  );

  return (
    <div>
      <div style={sectionLabel}>Session Mode</div>
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <ModeCard
          cardRef={modeRef}
          isActive={isManual}
          onClick={() => { onChange('autoNext', false); onChange('errorDetection', false); }}
          icon={<Hand size={16} />}
          title="Manual Tap"
          description="Advance turns manually."
        />
        <ModeCard
          cardRef={modeRef}
          isActive={isHandsFree}
          onClick={() => { onChange('autoNext', true); onChange('errorDetection', false); }}
          icon={<Mic size={16} />}
          title="Hands-Free"
          description="Auto-advance using mic (Silence)."
        />
        {sttSupported && (
          <ModeCard
            cardRef={modeRef}
            isActive={isSmart}
            onClick={() => { onChange('autoNext', true); onChange('errorDetection', true); }}
            icon={<BrainCircuit size={16} />}
            title="Smart Detection"
            description="Auto-advance + check accuracy."
            activeColor="rgba(99,102,241,0.8)"
            activeBg="rgba(99,102,241,0.1)"
            activeDotBg="#000"
          />
        )}
      </div>
    </div>
  );
};
