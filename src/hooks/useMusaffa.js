import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

export const useMusaffa = (quranAr, musaffaParams, setPartnerSubView) => {
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null);
  const [mudarasaTurn, setMudarasaTurn] = useState('app');

  const audioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const currentIndexRef = useRef(0);
  const wakeLockRef = useRef(null);
  const isPlayingRef = useRef(false);

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

  const createChunks = () => {
    const { startSurah, startAyah, endSurah, endAyah, portion } = musaffaParams;
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

  const playAyahAudioAsync = (number) => {
    return new Promise((resolve) => {
      const audio = getAudio(audioRef);
      const nextAudio = getAudio(nextAudioRef);
      const url = getAudioUrl(number);

      // Use preloaded audio if available
      if (nextAudio.src.endsWith(`/${number}.mp3`)) {
        const temp = audioRef.current;
        audioRef.current = nextAudioRef.current;
        nextAudioRef.current = temp;
        audioRef.current.onended = resolve;
        audioRef.current.onerror = resolve; // Don't hang on error
        audioRef.current.play().catch(() => resolve());
      } else {
        audio.src = url;
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(() => resolve());
      }
    });
  };

  const playCurrentIndex = async (currentChunks = chunks) => {
    if (currentChunks.length === 0) return;
    isPlayingRef.current = true;
    // Keep screen on for the full session (both app-reading and user-reciting)
    await acquireWakeLock();

    let idx = currentIndexRef.current % currentChunks.length;
    setMudarasaTurn('app');
    const chunk = currentChunks[idx];

    for (let i = 0; i < chunk.length; i++) {
      const ayah = chunk[i];
      setCurrentAyahNumber(ayah.number);

      // Preload next ayah
      const nextAyah = chunk[i + 1];
      if (nextAyah) {
        const na = getAudio(nextAudioRef);
        na.src = getAudioUrl(nextAyah.number);
        na.load();
      }

      await playAyahAudioAsync(ayah.number);
    }

    setCurrentAyahNumber(null);
    isPlayingRef.current = false;
    // Do NOT release wake lock here — keep screen on during user's recitation turn

    const nextIdx = (idx + 1) % currentChunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    setMudarasaTurn('user');
  };

  const startMusaffa = (overrideChunks) => {
    const finalChunks = Array.isArray(overrideChunks) ? overrideChunks : createChunks();
    if (finalChunks.length === 0) return;
    currentIndexRef.current = 0;
    setCurrentChunkIndex(0);
    setPartnerSubView('mudarasa');
    if (musaffaParams.whoStarts === 'app') playCurrentIndex(finalChunks);
    else {
      acquireWakeLock(); // Keep screen on even when user starts
      setMudarasaTurn('user');
    }
  };

  const handleNextTurnManual = () => {
    if (chunks.length === 0) return;
    if (window.navigator.vibrate) window.navigator.vibrate([40, 150]);
    // Pass chunks explicitly to avoid stale closure
    playCurrentIndex(chunks);
  };

  // Cleanup on unmount — stop audio and release screen lock
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (nextAudioRef.current) { nextAudioRef.current.pause(); nextAudioRef.current.src = ''; }
      releaseWakeLock();
    };
  }, []);

  return {
    chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn,
    startMusaffa, handleNextTurnManual
  };
};
