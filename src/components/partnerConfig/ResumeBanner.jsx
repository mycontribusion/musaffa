/**
 * ResumeBanner — shown on the config page when a saved Musaffa session exists.
 * Hidden while editing a preset.
 */
export const ResumeBanner = ({ savedSession, onResume, onDismiss }) => {
  if (!savedSession) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
      borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginBottom: '1rem',
      gap: '0.75rem',
    }}>
      <div>
        <p style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>Resume Session?</p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
          {savedSession.surahNumber
            ? `Surah ${savedSession.surahNumber} · Chunk ${savedSession.chunkIndex + 1}`
            : 'Continue from where you left off'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={onDismiss}
          style={{
            padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
            background: 'var(--bg-accent)', color: 'var(--text-secondary)', fontSize: '0.65rem',
            fontWeight: '700', cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
        <button
          onClick={onResume}
          style={{
            padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-gold)',
            background: 'var(--accent-gold)', color: '#000', fontSize: '0.65rem',
            fontWeight: '800', cursor: 'pointer',
          }}
        >
          Resume
        </button>
      </div>
    </div>
  );
};
