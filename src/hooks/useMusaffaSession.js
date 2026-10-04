import { useState, useCallback, useEffect, useRef } from 'react';

export const useMusaffaSession = (
  selectedSurah,
  musaffaParams,
  chunks,
  currentChunkIndex,
  mudarasaTurn,
  partnerSubView,
  view,
  surahs,
  startMusaffa,
  stopMusaffa,
  setSelectedSurah,
  setMusaffaParams,
  setView
) => {
  const [savedMusaffaSession, setSavedMusaffaSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_session') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    if (savedMusaffaSession) localStorage.setItem('quran_musaffa_session', JSON.stringify(savedMusaffaSession));
  }, [savedMusaffaSession]);

  const saveMusaffaSession = useCallback(() => {
    const surahNum = selectedSurah?.number || musaffaParams.startSurah;
    if (!surahNum) return;
    setSavedMusaffaSession({
      params: musaffaParams,
      chunkIndex: chunks.length > 0 ? currentChunkIndex : 0,
      turn: mudarasaTurn,
      surahNumber: surahNum,
      savedAt: new Date().toISOString(),
    });
  }, [selectedSurah, musaffaParams, chunks.length, currentChunkIndex, mudarasaTurn]);

  const clearMusaffaSession = useCallback(() => {
    localStorage.removeItem('quran_musaffa_session');
    setSavedMusaffaSession(null);
  }, []);

  useEffect(() => {
    if (partnerSubView !== 'mudarasa' || chunks.length === 0) return;
    const t = setTimeout(() => saveMusaffaSession(), 0);
    return () => clearTimeout(t);
  }, [partnerSubView, chunks.length, saveMusaffaSession]);

  const prevPartnerSubViewRef = useRef(partnerSubView);
  const prevViewRef = useRef(view);
  
  useEffect(() => {
    const wasInMudarasa = prevPartnerSubViewRef.current === 'mudarasa' && prevViewRef.current === 'partner';
    const isInMudarasa = partnerSubView === 'mudarasa' && view === 'partner';
    if (wasInMudarasa && !isInMudarasa) stopMusaffa();
    prevPartnerSubViewRef.current = partnerSubView;
    prevViewRef.current = view;
  }, [view, partnerSubView, stopMusaffa]);

  const resumeMusaffaSession = useCallback(() => {
    if (!savedMusaffaSession) return;
    const saved = { ...savedMusaffaSession };
    const savedSurah = surahs?.find(s => s.number === saved.surahNumber);
    if (savedSurah) setSelectedSurah(savedSurah);
    setMusaffaParams(saved.params);
    setView('partner');
    startMusaffa(null, saved.chunkIndex || 0, saved.turn || 'app', saved.params);
  }, [savedMusaffaSession, startMusaffa, setView, surahs, setSelectedSurah, setMusaffaParams]);

  /**
   * Treat a refresh on a session URL as "the user tapped Resume".
   *
   * Two details make this safe, and both were learned the hard way:
   *
   *  1. **Gate on the data, then latch.** `startMusaffa` -> `createChunks`
   *     dereferences `quranAr`, which is still null on the first commit. An
   *     earlier version latched its one-shot flag *before* attempting, so the
   *     attempt threw AND the retry that would have fixed it was suppressed —
   *     the session never resumed. Latching only once `surahs` is populated
   *     means this effect simply re-runs and resumes when the data lands.
   *     (`surahs` and `quranAr` are set in the same batch, so a non-empty
   *     `surahs` is a valid proxy for both.)
   *  2. **Latch per page load.** The auto-save effect above rewrites
   *     `savedMusaffaSession` on every portion advance, so without the ref this
   *     would re-fire continuously and `startMusaffa` would restart the
   *     session mid-recitation.
   *
   * If the browser's autoplay policy blocks the first ayah, `useMusaffa` sets
   * `audioError`, which surfaces the existing audio-error modal with a retry —
   * so the session is never silently stuck.
   */
  const autoResumedRef = useRef(false);

  useEffect(() => {
    if (autoResumedRef.current) return;
    if (!savedMusaffaSession) return;
    if (!surahs || surahs.length === 0) return; // data not ready — retry later
    const isMudarasaUrl = /^\/(?:surah\/\d+\/)?partner\/mudarasa\/?$/.test(window.location.pathname);
    if (!isMudarasaUrl) return;
    autoResumedRef.current = true;
    resumeMusaffaSession();
  }, [savedMusaffaSession, resumeMusaffaSession, surahs]);

  return {
    savedMusaffaSession,
    saveMusaffaSession,
    clearMusaffaSession,
    resumeMusaffaSession
  };
};
