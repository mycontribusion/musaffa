import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown, Download, Trash2, Volume2 } from 'lucide-react';
import { RECITERS } from '../utils/quranUtils';

/**
 * Audio Manager — a normal app view (like the Mistake Book), not a bottom sheet.
 *
 * It renders inside the usual `<main>` / `.app-container` flow, so the page
 * itself scrolls; there is no backdrop, no fixed positioning and no modal
 * close behaviour. The back control returns to the homepage through the same
 * `setView('list')` call the Mistake Book uses.
 *
 * The download/delete engine is unchanged: every action is delegated to the
 * existing `useAudioDownload` controls passed in from `App`.
 *
 * Downloaded state is reciter-scoped, so the reciter selector below the header
 * re-renders the whole list (and the summary count) for the selected reciter
 * using the same `reciter` / `setReciter` state the rest of the app uses.
 */
const AudioManager = ({ surahs, audioDownloadControls, reciter, setReciter, setView }) => {
  const [downloadingSurah, setDownloadingSurah] = useState(null);
  const [deletingSurah, setDeletingSurah] = useState(null);

  const {
    downloadStatus,
    downloadSurahAudio,
    deleteSurahAudio,
    isSurahAudioDownloaded,
    downloadedSurahs,
  } = audioDownloadControls;

  const handleDownload = useCallback(async (surahNumber) => {
    setDownloadingSurah(surahNumber);
    try {
      await downloadSurahAudio(surahNumber);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingSurah(null);
    }
  }, [downloadSurahAudio]);

  const handleDelete = useCallback(async (surahNumber) => {
    setDeletingSurah(surahNumber);
    try {
      await deleteSurahAudio(surahNumber);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingSurah(null);
    }
  }, [deleteSurahAudio]);

  const getStatusText = (surahNumber) => {
    if (deletingSurah === surahNumber) return 'Deleting…';
    if (downloadingSurah === surahNumber || (downloadStatus?.surahNumber === surahNumber && downloadStatus?.isDownloading)) {
      return downloadStatus?.message || 'Downloading…';
    }
    if (isSurahAudioDownloaded(surahNumber)) {
      return 'Downloaded';
    }
    return 'Not downloaded';
  };

  const getStatusColor = (surahNumber) => {
    if (deletingSurah === surahNumber || downloadingSurah === surahNumber) return 'var(--accent-gold)';
    if (isSurahAudioDownloaded(surahNumber)) return 'var(--accent-emerald)';
    return 'var(--text-muted)';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-24"
      style={{ maxWidth: '32rem', margin: '0 auto' }}
    >
      {/* Header — same Volume2 + "Audio Manager" identity, now with a back control */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 0 0.75rem',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setView('list')}
            aria-label="Back"
            title="Back to home"
            style={{
              width: '2rem', height: '2rem', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '999px',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <Volume2 size={18} color="var(--accent-gold)" strokeWidth={2} />
          <h2 style={{
            fontSize: '1rem', fontWeight: '900', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.01em',
          }}>
            Audio Manager
          </h2>
        </div>
      </div>

      {/* Reciter — same app state + RECITERS data used everywhere else */}
      <div style={{ padding: '1rem 0 0' }}>
        <label
          htmlFor="audio-manager-reciter"
          style={{
            display: 'block',
            fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
          }}
        >
          Reciter
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            id="audio-manager-reciter"
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            style={{
              width: '100%', appearance: 'none', WebkitAppearance: 'none',
              padding: '0.7rem 2.2rem 0.7rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-accent)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem', fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.style}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{ position: 'absolute', right: '0.85rem', pointerEvents: 'none', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        padding: '0.85rem 0 0.25rem',
        fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600',
      }}>
        <span>{downloadedSurahs.length} of {surahs.length} surahs downloaded</span>
        {downloadStatus?.notice && (
          <span style={{ color: 'var(--accent-gold)' }}>• {downloadStatus.notice}</span>
        )}
      </div>

      {/* List — the page scrolls, the list is no longer its own scroll container */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.35rem',
        padding: '0.5rem 0 1.5rem',
      }}>
        {surahs.map((surah) => {
          const isDownloaded = isSurahAudioDownloaded(surah.number);
          const isDownloading = downloadStatus?.surahNumber === surah.number && downloadStatus?.isDownloading;
          const isDeleting = deletingSurah === surah.number;

          return (
            <div
              key={surah.number}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-accent)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <span style={{
                fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-primary)',
                minWidth: '2.5rem',
              }}>
                {surah.number}
              </span>
              <span style={{
                fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)',
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {surah.englishName}
              </span>
              <span style={{
                fontSize: '0.65rem', fontWeight: '600', color: getStatusColor(surah.number),
                minWidth: '5rem', textAlign: 'right',
              }}>
                {getStatusText(surah.number)}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                {isDownloaded && !isDownloading && !isDeleting ? (
                  <button
                    onClick={() => handleDelete(surah.number)}
                    disabled={isDeleting}
                    title="Delete downloaded audio"
                    aria-label={`Delete audio for Surah ${surah.englishName}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2rem', height: '2rem', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(surah.number)}
                    disabled={isDownloading || isDeleting || downloadStatus?.isDownloading}
                    title="Download audio for offline use"
                    aria-label={`Download audio for Surah ${surah.englishName}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2rem', height: '2rem', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: isDownloading || downloadStatus?.isDownloading ? 'var(--text-muted)' : 'var(--accent-gold)',
                      cursor: isDownloading || downloadStatus?.isDownloading ? 'not-allowed' : 'pointer',
                      opacity: isDownloading || downloadStatus?.isDownloading || isDeleting ? 0.5 : 1,
                    }}
                  >
                    <Download size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AudioManager;
