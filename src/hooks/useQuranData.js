import { useState, useEffect } from 'react';
import { groupMutashabihatBySurah } from '../utils/mutashabihatParser';

export const useQuranData = (syncStateWithURL) => {
  const [surahs, setSurahs] = useState([]);
  const [quranAr, setQuranAr] = useState(null);
  const [quranEn, setQuranEn] = useState(null);
  const [mutashabihatData, setMutashabihatData] = useState(null);
  const [waqarData, setWaqarData] = useState(null);
  const [quranSimple, setQuranSimple] = useState(null); // simple text for error-detection comparison only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      let hasError = false;
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
        setError("You are offline and the data is not cached yet. Please connect to the internet to load Musaffa for the first time.");
        hasError = true;
      } finally {
        setLoading(false);
      }

      // Waqar114 — optional, loaded separately so it never blocks the app
      if (!hasError) {
        try {
          const waqarRes = await fetch('/data/waqar114.txt');
          if (!waqarRes.ok) throw new Error(`waqar114 fetch failed: ${waqarRes.status}`);
          const waqarTxt = await waqarRes.text();
          const parsed = groupMutashabihatBySurah(waqarTxt.split('\n').filter(l => l.trim()));
          setWaqarData(parsed);
        } catch (err) {
          console.warn('Waqar114 load error (Mastery Sessions unavailable):', err);
        }
      }

      // quran-simple.txt — optional, loaded separately so it never blocks the app.
      // Used ONLY for error-detection comparison in Musaffa; the on-screen text
      // continues to come from quran-ar.json.
      if (!hasError) {
        try {
          const simpleRes = await fetch('/data/quran-simple-clean.txt');
          if (!simpleRes.ok) throw new Error(`quran-simple-clean.txt fetch failed: ${simpleRes.status}`);
          const simpleTxt = await simpleRes.text();
          const lookup = {};
          simpleTxt.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            // Format: surah|ayah|text
            const firstPipe = trimmed.indexOf('|');
            const secondPipe = trimmed.indexOf('|', firstPipe + 1);
            if (firstPipe === -1 || secondPipe === -1) return;
            const surahNum = parseInt(trimmed.slice(0, firstPipe), 10);
            const ayahNum = parseInt(trimmed.slice(firstPipe + 1, secondPipe), 10);
            const text = trimmed.slice(secondPipe + 1);
            if (!isNaN(surahNum) && !isNaN(ayahNum)) {
              lookup[`${surahNum}|${ayahNum}`] = text;
            }
          });
          setQuranSimple(lookup);
        } catch (err) {
          console.warn('quran-simple.txt load error (error-detection comparison unavailable):', err);
        }
      }
    };

    fetchData();
  }, []);

  return { surahs, quranAr, quranEn, mutashabihatData, waqarData, quranSimple, loading, error };
};
