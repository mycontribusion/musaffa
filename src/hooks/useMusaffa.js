import { useState, useEffect, useRef } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

export const useMusaffa = (quranAr, musaffaParams, setPartnerSubView) => {
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null);
  const [mudarasaTurn, setMudarasaTurn] = useState('app');

  const audioRef = useRef(new Audio());
  const nextAudioRef = useRef(new Audio());
  const currentIndexRef = useRef(0);

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
      if (nextAudioRef.current.src === getAudioUrl(number)) {
        const temp = audioRef.current; audioRef.current = nextAudioRef.current; nextAudioRef.current = temp;
      } else { audioRef.current.src = getAudioUrl(number); }
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      audioRef.current.onended = resolve;
    });
  };

  const playCurrentIndex = async (currentChunks = chunks) => {
    if (currentChunks.length === 0) return;
    let idx = currentIndexRef.current % currentChunks.length;
    setMudarasaTurn('app');
    const chunk = currentChunks[idx];
    for (let i = 0; i < chunk.length; i++) {
      const ayah = chunk[i]; setCurrentAyahNumber(ayah.number);
      const nextAyah = chunk[i + 1];
      if (nextAyah) { nextAudioRef.current.src = getAudioUrl(nextAyah.number); nextAudioRef.current.load(); }
      await playAyahAudioAsync(ayah.number);
    }
    setCurrentAyahNumber(null);
    const nextIdx = (idx + 1) % currentChunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    setMudarasaTurn('user');
  };

  const startMusaffa = () => {
    const finalChunks = createChunks(); if (finalChunks.length === 0) return;
    currentIndexRef.current = 0; setCurrentChunkIndex(0); setPartnerSubView('mudarasa');
    if (musaffaParams.whoStarts === 'app') playCurrentIndex(finalChunks);
    else setMudarasaTurn('user');
  };

  const handleNextTurnManual = () => {
    if (chunks.length === 0) return;
    const nextIdx = (currentIndexRef.current + 1) % chunks.length;
    if (window.navigator.vibrate) window.navigator.vibrate([40, 150]);
    currentIndexRef.current = nextIdx; setCurrentChunkIndex(nextIdx);
    playCurrentIndex();
  };

  return {
    chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn,
    startMusaffa, handleNextTurnManual
  };
};
