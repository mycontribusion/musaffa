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

  useEffect(() => {
    if (savedMusaffaSession && typeof window !== 'undefined' && window.location.pathname.startsWith('/partner/mudarasa')) {
      const t = setTimeout(() => resumeMusaffaSession(), 0);
      return () => clearTimeout(t);
    }
  }, [savedMusaffaSession, resumeMusaffaSession]);

  return {
    savedMusaffaSession,
    saveMusaffaSession,
    clearMusaffaSession,
    resumeMusaffaSession
  };
};
