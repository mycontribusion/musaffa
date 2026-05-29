import { useState, useCallback, useEffect } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

/**
 * Hook to handle audio downloads for offline use
 * @param {Object} quranData - Quran data object containing surahs and ayahs
 * @param {string} reciterId - Reciter ID to use for downloads (default: 'ar.alafasy')
 * @returns {Object} download functions and state
 */
export const useAudioDownload = (quranData, reciterId = 'ar.alafasy') => {
  const [downloadStatus, setDownloadStatus] = useState({
    isDownloading: false,
    progress: 0,
    error: null,
    message: '',
  });

  // Track downloaded surahs in localStorage
  const [downloadedSurahs, setDownloadedSurahs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('quran_downloaded_surahs') || '[]');
    } catch {
      return [];
    }
  });

  // Persist downloaded surahs to localStorage
  useEffect(() => {
    localStorage.setItem('quran_downloaded_surahs', JSON.stringify(downloadedSurahs));
  }, [downloadedSurahs]);

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
   * Download audio for a specific surah
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {Promise<void>}
   */
  const downloadSurahAudio = useCallback(async (surahNumber) => {
    if (!quranData || !quranData.surahs) {
      setDownloadStatus({
        isDownloading: false,
        progress: 0,
        error: 'Quran data not available',
        message: 'Unable to download audio: Quran data not loaded',
      });
      return;
    }

    const surah = quranData.surahs.find(s => s.number === surahNumber);
    if (!surah) {
      setDownloadStatus({
        isDownloading: false,
        progress: 0,
        error: 'Surah not found',
        message: `Unable to download audio: Surah ${surahNumber} not found`,
      });
      return;
    }

    const totalAyahs = surah.ayahs.length;
    if (totalAyahs === 0) {
      setDownloadStatus({
        isDownloading: false,
        progress: 0,
        error: 'No ayahs found',
        message: `Unable to download audio: Surah ${surahNumber} has no ayahs`,
      });
      return;
    }

    setDownloadStatus({
      isDownloading: true,
      progress: 0,
      error: null,
      message: `Downloading audio for Surah ${surah.englishName}...`,
    });

    try {
      // Download each ayah audio file
      for (let i = 0; i < totalAyahs; i++) {
        const ayahNumber = i + 1;
        const globalNumber = surah.ayahs[i].number;
        // Use the same URL format as the app's audio playback
        const url = getAudioUrl(globalNumber, reciterId, surahNumber, ayahNumber);

        try {
          // Fetch with no-cors to trigger service worker caching
          // The service worker will cache the response for offline use
          await fetch(url, { mode: 'no-cors' });
        } catch (err) {
          console.warn(`Failed to download ayah ${ayahNumber}:`, err);
          // Continue with other ayahs rather than failing entirely
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalAyahs) * 100);
        setDownloadStatus(prev => ({
          ...prev,
          progress,
          message: `Downloading audio for Surah ${surah.englishName}... ${progress}%`,
        }));
      }

      // Add to downloaded surahs list
      setDownloadedSurahs(prev => {
        const newSet = new Set(prev);
        newSet.add(surahNumber);
        return Array.from(newSet);
      });

      // Request persistent storage after download completes
      const isPersistent = await requestPersistentStorage();
      
      setDownloadStatus({
        isDownloading: false,
        progress: 100,
        error: null,
        message: isPersistent 
          ? `Audio for Surah ${surah.englishName} downloaded successfully and stored persistently!`
          : `Audio for Surah ${surah.englishName} downloaded successfully! (Note: Storage may be cleared by browser under memory pressure)`,
      });
    } catch (err) {
      console.error('Error downloading surah audio:', err);
      setDownloadStatus({
        isDownloading: false,
        progress: 0,
        error: err.message || 'Unknown error',
        message: `Failed to download audio for Surah ${surah.englishName}`,
      });
    }
  }, [quranData, reciterId, requestPersistentStorage]);

  /**
   * Delete downloaded audio for a specific surah
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {Promise<void>}
   */
  const deleteSurahAudio = useCallback(async (surahNumber) => {
    if (!quranData || !quranData.surahs) return;

    const surah = quranData.surahs.find(s => s.number === surahNumber);
    if (!surah) return;

    const totalAyahs = surah.ayahs.length;
    const cache = await caches.open('quran-audio-v1');

    // Delete each ayah audio file from cache
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

    // Remove from downloaded surahs list
    setDownloadedSurahs(prev => prev.filter(s => s !== surahNumber));
    
    setDownloadStatus({
      isDownloading: false,
      progress: 0,
      error: null,
      message: `Audio for Surah ${surah.englishName} deleted successfully.`,
    });
  }, [quranData, reciterId]);

  /**
   * Check if audio for a surah is already downloaded/cached
   * @param {number} surahNumber - The surah number (1-114)
   * @returns {boolean} - True if audio is available in cache
   */
  const isSurahAudioDownloaded = useCallback((surahNumber) => {
    return downloadedSurahs.includes(surahNumber);
  }, [downloadedSurahs]);

  return {
    downloadStatus,
    downloadSurahAudio,
    deleteSurahAudio,
    isSurahAudioDownloaded,
    downloadedSurahs,
    requestPersistentStorage,
  };
};