import { useState, useCallback, useEffect, useRef } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

/**
 * Audio download bookkeeping / engine.
 *
 * Architecture is unchanged: audio bytes live in Cache Storage (written by the
 * existing CacheFirst service worker route) and this hook only owns the
 * *bookkeeping* + progress state. Nothing here replaces or bypasses the cache.
 *
 * Cached audio is reciter-specific because the cache key is the full remote URL,
 * so downloaded state is keyed by `reciterId -> surahNumber[]`.
 */

/** v2 store: { [reciterId]: number[] } */
const STORAGE_KEY = 'quran_downloaded_surahs_v2';
/** Original v1 store: number[] — no reciter information at all. */
const LEGACY_KEY = 'quran_downloaded_surahs';
/** Parking bucket for legacy entries we cannot yet attribute to a reciter. */
const LEGACY_BUCKET = '__legacy__';
/** Must match the CacheFirst runtime cache name in vite.config.js */
const AUDIO_CACHE = 'quran-audio-v1';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/** Explicit lifecycle states. */
export const DOWNLOAD_STATUS = {
  IDLE: 'idle',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const idleStatus = () => ({
  status: DOWNLOAD_STATUS.IDLE,
  isDownloading: false,
  progress: 0,
  error: null,
  message: '',
  surahNumber: null,
  completed: 0,
  total: 0,
  failedCount: 0,
  /** Transient one-off notice (e.g. "another download is running"). */
  notice: null,
});

/** Resolve a sleep early when the download is cancelled. */
const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

const isAborted = (signal) => Boolean(signal?.aborted);

/** Normalise a persisted map into `{ reciterId: number[] }`. */
const normalizeStore = (raw) => {
  const store = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return store;
  Object.entries(raw).forEach(([reciterId, list]) => {
    if (!Array.isArray(list)) return;
    const surahs = [...new Set(list.map(Number).filter((n) => Number.isInteger(n)))].sort(
      (a, b) => a - b
    );
    if (surahs.length) store[reciterId] = surahs;
  });
  return store;
};

export const useAudioDownload = (quranData, reciterId = 'ar.alafasy') => {
  const [downloadStatus, setDownloadStatus] = useState(idleStatus);

  /**
   * Downloaded surahs, keyed by reciter id.
   * A v1 array (`[2, 36]`) carries no reciter, so it is parked in a legacy
   * bucket and reconciled against the real Cache Storage further down.
   * No cached audio is ever deleted as part of this migration.
   */
  const [downloadedByReciter, setDownloadedByReciter] = useState(() => {
    const store = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return normalizeStore(parsed);
          }
        }
      } catch {
        // fall through to an empty store
      }
      return {};
    })();

    // If nothing is parked in the legacy bucket yet but the v1 key still holds
    // entries, carry them in so they can be verified against the real cache.
    // This must not depend on the v2 key being absent -- an existing but empty
    // v2 store must not silently skip the migration. Nothing is ever deleted and
    // the v1 key is left untouched.
    if (!store[LEGACY_BUCKET]) {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
        if (Array.isArray(legacy) && legacy.length) {
          const surahs = [
            ...new Set(legacy.map(Number).filter((n) => Number.isInteger(n))),
          ].sort((a, b) => a - b);
          if (surahs.length) store[LEGACY_BUCKET] = surahs;
        }
      } catch {
        // ignore malformed legacy data
      }
    }

    return store;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(downloadedByReciter));
    } catch (err) {
      console.warn('Failed to persist downloaded surah list:', err);
    }
  }, [downloadedByReciter]);

  /** Non-render lock so the guard works even in the same tick as a state update. */
  const activeRef = useRef(null);
  /** Legacy entries already probed for a given reciter, so unresolvable
   *  entries settle instead of being re-probed on every effect run. */
  const legacyTriedRef = useRef(new Set());

  const legacyPending = downloadedByReciter[LEGACY_BUCKET];

  /**
   * Legacy reconciliation.
   *
   * We can only honestly claim "downloaded for <reciter>" if that reciter's URLs
   * are actually in the cache. Probe the LAST ayah of each legacy surah (the
   * ayah the old sequential loop reached last) and adopt the surah for the
   * selected reciter only when that entry is present. Unverifiable entries stay
   * in the legacy bucket so they can be re-checked for another reciter — their
   * cached audio is never touched or deleted.
   */
  useEffect(() => {
    if (!Array.isArray(legacyPending) || legacyPending.length === 0) return;

    let cancelled = false;
    (async () => {
      // Probing the cache is async; nothing is reported synchronously here.
      await Promise.resolve();
      if (cancelled) return;
      if (!quranData?.surahs || typeof caches === 'undefined') return;

      const pending = legacyPending.filter(
        (n) => !legacyTriedRef.current.has(`${reciterId}:${n}`)
      );
      if (pending.length === 0) return;
      pending.forEach((n) => legacyTriedRef.current.add(`${reciterId}:${n}`));

      let cache;
      try {
        cache = await caches.open(AUDIO_CACHE);
      } catch (err) {
        console.warn('Legacy reconciliation: cache unavailable:', err);
        return;
      }

      const claimed = [];
      for (const surahNumber of pending) {
        if (cancelled) return;
        const surah = quranData.surahs.find((s) => s.number === surahNumber);
        if (!surah || surah.ayahs.length === 0) continue;
        const lastIdx = surah.ayahs.length - 1;
        try {
          const url = getAudioUrl(
            surah.ayahs[lastIdx].number,
            reciterId,
            surahNumber,
            lastIdx + 1
          );
          if (await cache.match(url)) claimed.push(surahNumber);
        } catch (err) {
          console.warn('Legacy reconciliation probe failed:', err);
        }
      }

      if (cancelled || claimed.length === 0) return;

      setDownloadedByReciter((prev) => {
        const next = { ...prev };
        const merged = new Set(next[reciterId] || []);
        claimed.forEach((n) => merged.add(n));
        next[reciterId] = Array.from(merged).sort((a, b) => a - b);
        const unresolved = legacyPending.filter((n) => !claimed.includes(n));
        if (unresolved.length) next[LEGACY_BUCKET] = unresolved;
        else delete next[LEGACY_BUCKET];
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reciterId, legacyPending, quranData]);

  /**
   * Request persistent storage for the web app
   */
  const requestPersistentStorage = useCallback(async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        return persistent;
      } catch (err) {
        console.warn('Failed to request persistent storage:', err);
        return false;
      }
    }
    return false;
  }, []);

  /**
   * Download audio for a specific surah.
   * Only one download may run at a time; a second attempt is rejected rather
   * than queued. Marks the surah downloaded for THIS reciter only, and only
   * when every ayah succeeded.
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {Promise<void>}
   */
  const downloadSurahAudio = useCallback(
    async (surahNumber) => {
      // Engine-level single-download guard (no queue).
      if (activeRef.current) {
        setDownloadStatus((prev) => ({
          ...prev,
          notice: 'Another audio download is already in progress.',
        }));
        return;
      }

      const fail = (error, message) => {
        setDownloadStatus({
          ...idleStatus(),
          status: DOWNLOAD_STATUS.FAILED,
          error,
          message,
        });
      };

      if (!quranData || !quranData.surahs) {
        fail('Quran data not available', 'Unable to download audio: Quran data not loaded');
        return;
      }

      const surah = quranData.surahs.find((s) => s.number === surahNumber);
      if (!surah) {
        fail('Surah not found', `Unable to download audio: Surah ${surahNumber} not found`);
        return;
      }

      const totalAyahs = surah.ayahs.length;
      if (totalAyahs === 0) {
        fail('No ayahs found', `Unable to download audio: Surah ${surahNumber} has no ayahs`);
        return;
      }

      const controller = new AbortController();
      const { signal } = controller;
      activeRef.current = { surahNumber, controller };

      const base = {
        status: DOWNLOAD_STATUS.DOWNLOADING,
        isDownloading: true,
        surahNumber,
        total: totalAyahs,
        completed: 0,
        progress: 0,
        failedCount: 0,
        error: null,
        notice: null,
        message: `Downloading audio for Surah ${surah.englishName}…`,
      };
      setDownloadStatus(base);

      const cancelledStatus = (completed) => ({
        status: DOWNLOAD_STATUS.CANCELLED,
        isDownloading: false,
        surahNumber: null,
        total: totalAyahs,
        completed,
        progress: Math.round((completed / totalAyahs) * 100),
        failedCount: 0,
        error: null,
        notice: null,
        message: `Download cancelled — Surah ${surah.englishName} was not saved for offline use.`,
      });

      const failedAyahs = [];
      let completed = 0;

      try {
        for (let i = 0; i < totalAyahs; i++) {
          // No new requests are started after cancellation.
          if (isAborted(signal)) {
            setDownloadStatus(cancelledStatus(completed));
            return;
          }

          const ayahNumber = i + 1;
          const globalNumber = surah.ayahs[i].number;
          // Use the same URL format as the app's audio playback
          const url = getAudioUrl(globalNumber, reciterId, surahNumber, ayahNumber);

          let success = false;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (isAborted(signal)) break;
            try {
              // Fetch with no-cors to trigger service worker caching
              await fetch(url, { mode: 'no-cors', signal });
              success = true;
              break; // Success, exit retry loop
            } catch (err) {
              if (isAborted(signal) || err?.name === 'AbortError') break;
              console.warn(`Attempt ${attempt} failed to download ayah ${ayahNumber}:`, err);
              if (attempt < MAX_ATTEMPTS) {
                await sleep(RETRY_DELAY_MS, signal);
              }
            }
          }

          if (isAborted(signal)) {
            setDownloadStatus(cancelledStatus(completed));
            return;
          }

          if (!success) {
            console.error(
              `Failed to download ayah ${ayahNumber} completely after ${MAX_ATTEMPTS} attempts.`
            );
            failedAyahs.push(ayahNumber);
            continue;
          }

          completed++;
          const progress = Math.round((completed / totalAyahs) * 100);
          setDownloadStatus((prev) => ({ ...prev, completed, progress }));
        }

        if (isAborted(signal)) {
          setDownloadStatus(cancelledStatus(completed));
          return;
        }

        // Partial download: keep whatever already cached, but do NOT claim the
        // surah is available offline.
        if (failedAyahs.length > 0) {
          const plural = failedAyahs.length === 1 ? '' : 's';
          const message = `Download incomplete — ${failedAyahs.length} ayah${plural} could not be downloaded.`;
          setDownloadStatus({
            ...base,
            status: DOWNLOAD_STATUS.FAILED,
            isDownloading: false,
            surahNumber: null,
            completed,
            progress: Math.round((completed / totalAyahs) * 100),
            failedCount: failedAyahs.length,
            error: message,
            message,
          });
          return;
        }

        // Complete: record for this reciter only.
        setDownloadedByReciter((prev) => {
          const merged = new Set(prev[reciterId] || []);
          merged.add(surahNumber);
          return { ...prev, [reciterId]: Array.from(merged).sort((a, b) => a - b) };
        });

        const isPersistent = await requestPersistentStorage();

        setDownloadStatus({
          status: DOWNLOAD_STATUS.DOWNLOADED,
          isDownloading: false,
          surahNumber: null,
          total: totalAyahs,
          completed: totalAyahs,
          progress: 100,
          failedCount: 0,
          error: null,
          notice: null,
          message: isPersistent
            ? `Audio for Surah ${surah.englishName} downloaded successfully and stored persistently!`
            : `Audio for Surah ${surah.englishName} downloaded successfully! (Note: Storage may be cleared by browser under memory pressure)`,
        });
      } catch (err) {
        if (isAborted(signal) || err?.name === 'AbortError') {
          setDownloadStatus(cancelledStatus(completed));
          return;
        }
        console.error('Error downloading surah audio:', err);
        setDownloadStatus({
          ...base,
          status: DOWNLOAD_STATUS.FAILED,
          isDownloading: false,
          surahNumber: null,
          completed,
          progress: Math.round((completed / totalAyahs) * 100),
          error: err.message || 'Unknown error',
          message: `Failed to download audio for Surah ${surah.englishName}`,
        });
      } finally {
        activeRef.current = null;
      }
    },
    [quranData, reciterId, requestPersistentStorage]
  );

  /**
   * Cancel the active download. Already-cached audio is left untouched and the
   * surah is not marked downloaded. A new download can start immediately after.
   */
  const cancelDownload = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current.controller.abort();
  }, []);

  /**
   * Delete downloaded audio for a specific surah, for the CURRENT reciter only.
   * Other reciters' cached entries and bookkeeping are left intact.
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {Promise<void>}
   */
  const deleteSurahAudio = useCallback(
    async (surahNumber) => {
      if (activeRef.current) {
        setDownloadStatus((prev) => ({
          ...prev,
          notice: 'Another audio download is already in progress.',
        }));
        return;
      }

      if (!quranData || !quranData.surahs) return;

      const surah = quranData.surahs.find((s) => s.number === surahNumber);
      if (!surah) return;

      const totalAyahs = surah.ayahs.length;

      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(AUDIO_CACHE);
          for (let i = 0; i < totalAyahs; i++) {
            const ayahNumber = i + 1;
            const globalNumber = surah.ayahs[i].number;
            const url = getAudioUrl(globalNumber, reciterId, surahNumber, ayahNumber);
            try {
              await cache.delete(url);
            } catch (err) {
              console.warn(`Failed to delete ayah ${ayahNumber} from cache:`, err);
            }
          }
        } catch (err) {
          console.warn('Failed to open audio cache for deletion:', err);
        }
      }

      // Remove only this reciter + surah pair.
      setDownloadedByReciter((prev) => {
        if (!(prev[reciterId] || []).includes(surahNumber)) return prev;
        const next = { ...prev };
        const remaining = prev[reciterId].filter((s) => s !== surahNumber);
        if (remaining.length) next[reciterId] = remaining;
        else delete next[reciterId];
        return next;
      });

      setDownloadStatus({
        ...idleStatus(),
        status: DOWNLOAD_STATUS.IDLE,
        message: `Audio for Surah ${surah.englishName} deleted successfully.`,
      });
    },
    [quranData, reciterId]
  );

  /**
   * Is this surah downloaded for the CURRENTLY SELECTED reciter?
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {boolean}
   */
  const isSurahAudioDownloaded = useCallback(
    (surahNumber) => {
      const list = downloadedByReciter[reciterId];
      return Array.isArray(list) && list.includes(surahNumber);
    },
    [downloadedByReciter, reciterId]
  );

  return {
    downloadStatus,
    downloadSurahAudio,
    cancelDownload,
    deleteSurahAudio,
    isSurahAudioDownloaded,
    /** Downloaded surahs for the current reciter (kept for existing consumers). */
    downloadedSurahs: downloadedByReciter[reciterId] || [],
    downloadedByReciter,
    reciterId,
    requestPersistentStorage,
  };
};
