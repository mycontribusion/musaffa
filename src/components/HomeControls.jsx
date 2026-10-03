import { BookOpen, Volume2 } from 'lucide-react';

/**
 * HomeControls — the homepage row that sits directly below the global header.
 *
 * The row shows two always-visible pills:
 *
 *  - Mistake Book and Audio Manager both navigate through `setView`, exactly
 *    like every other page in the app. The Audio Manager view is rendered by
 *    `App` and drives the existing `useAudioDownload` engine
 *    (downloadedByReciter, downloadSurahAudio, deleteSurahAudio,
 *    isSurahAudioDownloaded).
 *
 * No controls are hidden behind a menu.
 */

const pill = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.7rem 1.1rem', borderRadius: 'var(--radius-md)',
  background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)', cursor: 'pointer', transition: 'var(--transition-fast)',
  minHeight: '44px', fontSize: 'var(--fs-secondary)',
};

const HomeControls = ({ setView }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--space-5)', marginBottom: '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {/* Mistake Book — unchanged destination.
            Shares the exact subdued `.field-label` treatment used by Audio
            Manager so the two read as one secondary/utility group. Visual only:
            the destination, text and position are untouched. */}
        <button
          onClick={() => setView('weaknesses')}
          style={pill}
          title="Mistake Book (Weaknesses)"
        >
          <BookOpen size={15} color="var(--accent-gold)" strokeWidth={2} />
          <span className="field-label">Mistake Book</span>
        </button>

        {/* Audio Manager — navigates to the Audio Manager view */}
        <button
          onClick={() => setView('audio-manager')}
          style={pill}
          title="Audio Manager"
        >
          <Volume2 size={15} color="var(--accent-gold)" strokeWidth={2} />
          <span className="field-label">Audio Manager</span>
        </button>
      </div>
    </div>
  );
};

export default HomeControls;
