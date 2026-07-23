import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

export const useMusaffa = (quranAr, musaffaParams, setPartnerSubView, reciter = 'ar.alafasy') => {
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null);
  const [mudarasaTurn, setMudarasaTurn] = useState('app');
  const [isPaused, setIsPaused] = useState(false);
  const [audioError, setAudioError] = useState(null); // 'retrying' | 'failed' | null
  const [retryCount, setRetryCount] = useState(0);

  const MAX_RETRIES = 3;

  const audioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const currentIndexRef = useRef(0);
  const wakeLockRef = useRef(null);
  const isPlayingRef = useRef(false);
  const shouldStopRef = useRef(false);
  const pausedAyahIndexRef = useRef(0); // Track which ayah we paused at

  // Initialise audio objects lazily so they aren't created during SSR
  const getAudio = (ref) => {
    if (!ref.current) ref.current = new Audio();
    return ref.current;
  };

  // ── Wake Lock ────────────────────────────────────────────────────────────
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) { console.warn('Wake Lock unavailable:', e); }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  // Re-acquire wake lock if page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && mudarasaTurn === 'app' && isPlayingRef.current) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [mudarasaTurn]);

  const createChunks = (params = musaffaParams) => {
    const { startSurah, startAyah, endSurah, endAyah, portion } = params;
    let allAyahsInRange = [];
    for (let s = startSurah; s <= endSurah; s++) {
      const surahAyahs = quranAr.surahs[s - 1].ayahs;
      let startIdx = (s === startSurah) ? startAyah - 1 : 0;
      let endIdx = (s === endSurah) ? endAyah : surahAyahs.length;
      allAyahsInRange = [...allAyahsInRange, ...surahAyahs.slice(startIdx, endIdx).map(a => ({ ...a, surahNumber: s }))];
    }
    if (allAyahsInRange.length === 0) return [];

    const newChunks = []; let currentChunk = [];

    if (portion === 'verse') {
      allAyahsInRange.forEach(a => newChunks.push([a]));
    } else if (portion === 'page') {
      let lastPage = allAyahsInRange[0].page;
      allAyahsInRange.forEach(a => {
        if (a.page !== lastPage) { newChunks.push(currentChunk); currentChunk = []; lastPage = a.page; }
        currentChunk.push(a);
      });
    } else if (portion === 'half' || portion === 'third') {
      let pageGroups = {};
      allAyahsInRange.forEach(a => { if (!pageGroups[a.page]) pageGroups[a.page] = []; pageGroups[a.page].push(a); });
      Object.values(pageGroups).forEach(group => {
        const parts = portion === 'half' ? 2 : 3;
        for (let i = 0; i < parts; i++) {
          const start = Math.ceil(i * group.length / parts);
          const end = Math.ceil((i + 1) * group.length / parts);
          const part = group.slice(start, end);
          if (part.length > 0) newChunks.push(part);
        }
      });
    } else if (portion === 'rubu') {
      let lastRubu = allAyahsInRange[0].hizbQuarter;
      allAyahsInRange.forEach(a => {
        if (a.hizbQuarter !== lastRubu) { newChunks.push(currentChunk); currentChunk = []; lastRubu = a.hizbQuarter; }
        currentChunk.push(a);
      });
    } else if (portion === 'hizb') {
      let lastHizb = Math.ceil(allAyahsInRange[0].hizbQuarter / 2);
      allAyahsInRange.forEach(a => {
        const currentHizb = Math.ceil(a.hizbQuarter / 2);
        if (currentHizb !== lastHizb) { newChunks.push(currentChunk); currentChunk = []; lastHizb = currentHizb; }
        currentChunk.push(a);
      });
    }

    if (currentChunk.length) newChunks.push(currentChunk);
    const finalChunks = newChunks.filter(c => c.length > 0);
    setChunks(finalChunks);
    return finalChunks;
  };

  const handleAudioPlaySuccess = () => {
    setAudioError(null);
    setRetryCount(0);
  };

  const playAyahAudioAsync = (ayah) => {
    return new Promise((resolve, reject) => {
      const audio = getAudio(audioRef);
      const nextAudio = getAudio(nextAudioRef);
      const url = getAudioUrl(ayah.number, reciter, ayah.surahNumber, ayah.numberInSurah);

      // Use preloaded audio ONLY if it perfectly matches the requested URL (including reciter)
      if (nextAudio.src === url) {
        const temp = audioRef.current;
        audioRef.current = nextAudioRef.current;
        nextAudioRef.current = temp;
        audioRef.current.onended = resolve;
        audioRef.current.onerror = () => reject(new Error('Audio playback failed'));
        audioRef.current.onplay = handleAudioPlaySuccess;
        audioRef.current.play().catch(() => reject(new Error('Audio playback failed')));
      } else {
        audio.src = url;
        audio.onended = resolve;
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.onplay = handleAudioPlaySuccess;
        audio.play().catch(() => reject(new Error('Audio playback failed')));
      }
    });
  };

  const playAyahWithRetry = async (ayah) => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await playAyahAudioAsync(ayah);
        return true; // Success
      } catch (err) {
        console.warn('Audio playback failed:', err);
        if (attempt < MAX_RETRIES) {
          setAudioError('retrying');
          setRetryCount(attempt + 1);
          // Exponential backoff: 1s, 2s, 3s
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        } else {
          setAudioError('failed');
          setRetryCount(0);
          // Wait a moment so the user sees the failed state, then clear
          await new Promise(resolve => setTimeout(resolve, 2000));
          setAudioError(null);
          return false; // Failed after all retries
        }
      }
    }
    return false;
  };

  const playCurrentIndex = async (currentChunks = chunks, startFromAyahIndex = 0) => {
    if (currentChunks.length === 0) return;
    isPlayingRef.current = true;
    shouldStopRef.current = false;
    // Keep screen on for the full session (both app-reading and user-reciting)
    // DO NOT await this, otherwise the user-gesture token expires and Safari blocks the first audio!
    acquireWakeLock();

    let idx = currentIndexRef.current % currentChunks.length;
    setMudarasaTurn('app');
    const chunk = currentChunks[idx];

    // Start from the specified ayah index (for resume)
    for (let i = startFromAyahIndex; i < chunk.length; i++) {
      // Check if we should stop
      if (shouldStopRef.current) {
        // Save the current ayah index for resume
        pausedAyahIndexRef.current = i;
        setCurrentAyahNumber(null);
        isPlayingRef.current = false;
        return;
      }
      
      const ayah = chunk[i];

      // Play Bismillah for the start of any Surah (except Fatiha and Tawbah)
      if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
        // Preload the actual first verse while Bismillah is playing
        const na = getAudio(nextAudioRef);
        na.src = getAudioUrl(ayah.number, reciter, ayah.surahNumber, ayah.numberInSurah);
        na.load();
        
        try {
          setCurrentAyahNumber('bismillah-' + ayah.number);
          // Play Bismillah (Ayah 1 of Surah 1)
          await playAyahAudioAsync({ number: 1, surahNumber: 1, numberInSurah: 1 });
        } catch (err) {
          console.warn('Failed to play Bismillah, skipping...');
        }
      }

      setCurrentAyahNumber(ayah.number);

      // Preload next ayah
      const nextAyah = chunk[i + 1];
      if (nextAyah) {
        const na = getAudio(nextAudioRef);
        na.src = getAudioUrl(nextAyah.number, reciter, nextAyah.surahNumber, nextAyah.numberInSurah);
        na.load();
      }

      const success = await playAyahWithRetry(ayah);
      if (!success) {
        // Auto-skip to next ayah after max retries
        continue;
      }
    }

    setCurrentAyahNumber(null);
    isPlayingRef.current = false;
    // Do NOT release wake lock here — keep screen on during user's recitation turn

    const nextIdx = (idx + 1) % currentChunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    setMudarasaTurn('user');
  };

  const startMusaffa = (overrideChunks, startChunkIndex = 0, initialTurn, overrideParams) => {
    // Attempt to unlock audio elements for Safari/Chrome autoplay policy
    try {
      const a1 = getAudio(audioRef);
      const a2 = getAudio(nextAudioRef);
      // Small silent wav to safely unlock play
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      if (!a1.src) a1.src = silentWav;
      if (!a2.src) a2.src = silentWav;
      a1.play().then(() => a1.pause()).catch(() => {});
      a2.play().then(() => a2.pause()).catch(() => {});
    } catch (e) {}

    // If overrideParams is provided, use it to create chunks; otherwise use overrideChunks or createChunks()
    let finalChunks;
    if (overrideParams) {
      finalChunks = createChunks(overrideParams);
    } else {
      finalChunks = Array.isArray(overrideChunks) ? overrideChunks : createChunks();
    }
    if (finalChunks.length === 0) return;
    currentIndexRef.current = startChunkIndex;
    setCurrentChunkIndex(startChunkIndex);
    pausedAyahIndexRef.current = 0; // Reset pause position for new session
    setPartnerSubView('mudarasa');
    // If initialTurn is provided (for resume), use it; otherwise check whoStarts
    if (initialTurn) {
      setMudarasaTurn(initialTurn);
      if (initialTurn === 'app') {
        playCurrentIndex(finalChunks);
      } else {
        acquireWakeLock(); // Keep screen on even when user starts
      }
    } else if (musaffaParams.whoStarts === 'app') {
      playCurrentIndex(finalChunks);
    } else {
      acquireWakeLock(); // Keep screen on even when user starts
      setMudarasaTurn('user');
    }
  };

  const handleNextTurnManual = () => {
    if (chunks.length === 0) return;
    if (window.navigator.vibrate) window.navigator.vibrate([40, 150]);
    
    // The user just finished their turn on the current chunk. 
    // Advance to the NEXT chunk before the app plays!
    const nextIdx = (currentIndexRef.current + 1) % chunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    
    // ---- NEW: Preload first ayah of the upcoming chunk ----
    const nextChunk = chunks[nextIdx];
    if (nextChunk && nextChunk.length > 0) {
      const firstAyah = nextChunk[0];
      const preAudio = getAudio(nextAudioRef);
      preAudio.src = getAudioUrl(firstAyah.number, reciter, firstAyah.surahNumber, firstAyah.numberInSurah);
      preAudio.load(); // start downloading immediately
    }
    // -----------------------------------------------------
    
    // Pass chunks explicitly to avoid stale closure
    playCurrentIndex(chunks);
  };

  // Pause musaffa - stop audio and release wake lock
  const pauseMusaffa = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
    }
    releaseWakeLock();
    setIsPaused(true);
  }, []);

  // Resume musaffa - re-acquire wake lock and continue playback from where it was paused
  const resumeMusaffa = useCallback(() => {
    setAudioError(null);
    acquireWakeLock();
    setIsPaused(false);
    // Resume playback if we were in the middle of app playback
    if (mudarasaTurn === 'app' && chunks.length > 0) {
      playCurrentIndex(chunks, pausedAyahIndexRef.current);
    }
  }, [chunks, mudarasaTurn]);

  // Stop musaffa - stop audio, release wake lock, and reset paused state
  const stopMusaffa = useCallback(() => {
    // Signal to stop the playback loop
    shouldStopRef.current = true;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.onplay = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.src = '';
      nextAudioRef.current.onended = null;
      nextAudioRef.current.onerror = null;
      nextAudioRef.current.onplay = null;
    }
    releaseWakeLock();
    isPlayingRef.current = false;
    setIsPaused(false);
    setAudioError(null);
    setRetryCount(0);
  }, []);

  // Cleanup on unmount — stop audio and release screen lock
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (nextAudioRef.current) { nextAudioRef.current.pause(); nextAudioRef.current.src = ''; }
      releaseWakeLock();
    };
  }, []);

  return {
    chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, isPaused, audioError, setAudioError, retryCount,
    startMusaffa, handleNextTurnManual, pauseMusaffa, resumeMusaffa, stopMusaffa
  };
};
