import { useState, useEffect } from 'react';
import { groupMutashabihatBySurah } from '../utils/mutashabihatParser';

export const useQuranData = (syncStateWithURL) => {
  const [surahs, setSurahs] = useState([]);
  const [quranAr, setQuranAr] = useState(null);
  const [quranEn, setQuranEn] = useState(null);
  const [mutashabihatData, setMutashabihatData] = useState(null);
  const [waqarData, setWaqarData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Core data — must succeed
        const [sRes, arRes, enRes, mutRes] = await Promise.all([
          fetch('/data/surahs.json'),
          fetch('/data/quran-ar.json'),
          fetch('/data/quran-en.json'),
          fetch('/data/mutashabihat.json'),
        ]);
        const [sData, arData, enData, mutData] = await Promise.all([
          sRes.json(), arRes.json(), enRes.json(), mutRes.json(),
        ]);

        const surahList = Array.isArray(sData) ? sData : sData.data;
        setSurahs(surahList);
        setQuranAr(arData.data || arData);
        setQuranEn(enData.data || enData);
        setMutashabihatData(mutData);
        syncStateWithURL(surahList);
      } catch (err) {
        console.error('Core data load error', err);
      } finally {
        setLoading(false);
      }

      // Waqar114 — optional, loaded separately so it never blocks the app
      try {
        const waqarRes = await fetch('/data/waqar114');
        if (!waqarRes.ok) throw new Error(`waqar114 fetch failed: ${waqarRes.status}`);
        const waqarTxt = await waqarRes.text();
        const parsed = groupMutashabihatBySurah(waqarTxt.split('\n').filter(l => l.trim()));
        setWaqarData(parsed);
      } catch (err) {
        console.warn('Waqar114 load error (Mastery Sessions unavailable):', err);
      }
    };

    fetchData();
  }, []);

  return { surahs, quranAr, quranEn, mutashabihatData, waqarData, loading };
};
