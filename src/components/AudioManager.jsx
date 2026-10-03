import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, Download, Trash2, Volume2, X } from 'lucide-react';
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
  /* Deleting is destructive and the cached files are not recoverable, so the
     trash button no longer deletes directly — it stages the surah number here
     and the confirm modal below performs the actual delete. */
  const [pendingDelete, setPendingDelete] = useState(null);

  const {
    downloadStatus,
    downloadSurahAudio,
    cancelDownload,
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

  /* Only reached from the confirm modal — the row button just stages the number. */
  const confirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    setPendingDelete(null);
    handleDelete(target);
  };

  const pendingDeleteSurah = pendingDelete === null
    ? null
    : surahs.find((s) => s.number === pendingDelete) || null;

  // Escape dismisses the confirm modal, matching the rest of the app's dialogs.
  useEffect(() => {
    if (pendingDelete === null) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPendingDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDelete]);

  /**
   * While a surah is downloading the row shows compact live progress —
   * `42% (120/286)` — instead of the engine's long "Downloading audio for
   * Surah X…" message, which carried no information the row didn't already
   * show. Falls back to `Starting…` for the first paint, before the hook has
   * reported a total ayah count.
   */
  const getStatusText = (surahNumber) => {
    if (deletingSurah === surahNumber) return 'Deleting…';
    if (downloadingSurah === surahNumber || (downloadStatus?.surahNumber === surahNumber && downloadStatus?.isDownloading)) {
      if (downloadStatus?.total > 0) {
        return `${downloadStatus.progress}% (${downloadStatus.completed}/${downloadStatus.total})`;
      }
      return 'Starting…';
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
      {/* Full-bleed top-level header. The global header is not rendered on the
          Audio Manager view, so this bar is the page's only header: it pins at
          `top: 0` and breaks out of the 32rem page column (`100vw` plus a
          centred negative margin) so its background and hairline span the whole
          viewport. `py-2` around a `--control-md-h` back control reproduces the
          global header's exact height, and the inner row keeps the 32rem width
          of the rest of this page so the title stays aligned with the list. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
        backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)',
      }}>
        <div style={{ maxWidth: '32rem', margin: '0 auto' }}>
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => setView('list')}
                aria-label="Back"
                title="Back to home"
                style={{
                  width: 'var(--control-md-h)', height: 'var(--control-md-h)', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-full)',
                  border: 'var(--border-hairline)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <Volume2 size={18} color="var(--accent-gold)" strokeWidth={2} />
              <h2 style={{
                fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)',
                margin: 0, letterSpacing: '-0.01em',
              }}>
                Audio Manager
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Reciter — same app state + RECITERS data used everywhere else */}
      <div style={{ padding: '1rem 0 0' }}>
        <label
          htmlFor="audio-manager-reciter"
          style={{
            display: 'block',
            fontSize: 'var(--fs-label)', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)',
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
              border: 'var(--border-hairline)',
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
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap',
        padding: '0.85rem 0 0.25rem',
        fontSize: 'var(--fs-secondary)', color: 'var(--text-muted)', fontWeight: '600',
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
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-accent)',
                border: 'var(--border-hairline)',
              }}
            >
              <span style={{
                fontSize: 'var(--fs-body-sm)', fontWeight: '800', color: 'var(--text-primary)',
                minWidth: '2.5rem',
              }}>
                {surah.number}
              </span>
              <span style={{
                fontSize: 'var(--fs-body-sm)', fontWeight: '600', color: 'var(--text-primary)',
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {surah.englishName}
              </span>
              {/* Live progress (`42% (120/286)`) while downloading. `minWidth` is
                  wide enough for a 3-digit ayah count on the longest surahs
                  (Al-Baqarah, 286) without the name column reflowing. */}
              <span style={{
                fontSize: 'var(--fs-meta)', fontWeight: '700', color: getStatusColor(surah.number),
                minWidth: '8rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>
                {getStatusText(surah.number)}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                {isDownloading ? (
                  /* The active download is cancellable in place: the download icon
                     is replaced by an X that calls the hook's `cancelDownload`,
                     which aborts the in-flight fetches. The cancelled partials are
                     never added to the reciter's downloaded set, so the row
                     falls back to its normal download button afterwards. */
                  <button
                    onClick={cancelDownload}
                    title="Cancel download"
                    aria-label={`Cancel download of Surah ${surah.englishName}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-red)',
                      background: 'var(--accent-red-soft)',
                      color: 'var(--accent-red)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                ) : isDownloaded && !isDeleting ? (
                  <button
                    onClick={() => setPendingDelete(surah.number)}
                    disabled={isDeleting}
                    title="Delete downloaded audio"
                    aria-label={`Delete audio for Surah ${surah.englishName}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(surah.number)}
                    disabled={isDeleting || downloadStatus?.isDownloading}
                    title="Download audio for offline use"
                    aria-label={`Download audio for Surah ${surah.englishName}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: downloadStatus?.isDownloading ? 'var(--text-muted)' : 'var(--accent-gold)',
                      cursor: downloadStatus?.isDownloading ? 'not-allowed' : 'pointer',
                      opacity: downloadStatus?.isDownloading || isDeleting ? 0.5 : 1,
                    }}
                  >
                    <Download size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Delete confirmation modal ──
          Rendered inside the page's own motion tree so it inherits the view's
          enter/exit transitions. The overlay is `position: fixed` and sits
          above the sticky header, and a click on the backdrop or the Escape
          key both dismiss without deleting. Colour comes from the shared
          --accent-red / --accent-red-soft tokens so it matches the cancel
          control in the rows. */}
      <AnimatePresence>
        {pendingDelete !== null && (
          <motion.div
            key="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingDelete(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              /* Stop the backdrop's dismiss handler from firing when the
                 dialog itself is tapped. */
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '22rem',
                borderRadius: '2rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-red)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
                padding: '2rem 1.75rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                  background: 'var(--accent-red-soft)', border: '1px solid var(--accent-red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={22} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 id="delete-confirm-title" style={{ fontSize: '1rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                    Delete downloaded audio?
                  </h3>
                  <p style={{ fontSize: '0.8rem', margin: '0.4rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    This removes the offline audio for{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {pendingDeleteSurah ? pendingDeleteSurah.englishName : `Surah ${pendingDelete}`}
                    </strong>
                    . You will need to download it again to listen without a connection.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  onClick={confirmDelete}
                  style={{
                    height: '3rem', borderRadius: '1rem', cursor: 'pointer',
                    background: 'var(--accent-red-soft)',
                    border: '1px solid var(--accent-red)',
                    color: 'var(--accent-red)', fontWeight: '800', fontSize: '0.75rem',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  onClick={() => setPendingDelete(null)}
                  style={{
                    height: '2.75rem', borderRadius: '1rem', cursor: 'pointer',
                    background: 'var(--bg-accent)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)', fontWeight: '700', fontSize: 'var(--fs-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  Keep Audio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AudioManager;
