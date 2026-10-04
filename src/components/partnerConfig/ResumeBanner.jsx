import { X } from 'lucide-react';

/**
 * ResumeBanner — shown on the config page when a saved Musaffa session exists.
 * Hidden while editing a preset.
 *
 * The secondary "Dismiss" action is an `X` icon button rather than a text pill:
 * dismissing is a low-emphasis, self-evident action, and the text label spent
 * more horizontal width than the control needed — squeezing the primary
 * "Resume" button on narrow screens. It reuses the shared `.icon-btn` box with
 * `.icon-btn-sm` for the compact 36px size, matching the tight controls in the
 * other compact sub-page headers, and keeps an `aria-label` so the control is
 * still announced now that it carries no visible text.
 */
export const ResumeBanner = ({ savedSession, onResume, onDismiss }) => {
  if (!savedSession) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
      borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginBottom: 'var(--space-4)',
      gap: 'var(--space-3)',
    }}>
      <div>
        <p style={{ fontWeight: '800', fontSize: 'var(--fs-body-sm)', color: 'var(--accent-gold)' }}>Resume Session?</p>
        <p style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)' }}>
          {savedSession.surahNumber
            ? `Surah ${savedSession.surahNumber} · Chunk ${savedSession.chunkIndex + 1}`
            : 'Continue from where you left off'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onDismiss}
          className="icon-btn icon-btn-sm"
          aria-label="Dismiss resume prompt"
          title="Dismiss"
        >
          <X size={16} />
        </button>
        <button
          onClick={onResume}
          style={{
            padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--gold-gradient)', color: 'var(--text-on-gold)', fontSize: 'var(--fs-label)',
            fontWeight: '800', cursor: 'pointer',
          }}
        >
          Resume
        </button>
      </div>
    </div>
  );
};
