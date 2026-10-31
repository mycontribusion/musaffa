// Build comprehensive lists of Juz' (30) and Hizb (60) divisions
// from the Quran data, each with name, start and end surah:ayah.

export const buildJuzList = (surahs) => {
  if (!surahs) return [];
  const map = new Map();
  surahs.forEach(s => {
    s.ayahs.forEach(a => {
      if (!map.has(a.juz)) map.set(a.juz, { juz: a.juz, start: { surah: s.number, ayah: a.numberInSurah }, end: null });
      map.get(a.juz).end = { surah: s.number, ayah: a.numberInSurah };
    });
  });
  return Array.from(map.values()).sort((a, b) => a.juz - b.juz);
};

export const buildHizbList = (surahs) => {
  if (!surahs) return [];
  // 60 hizb = 2 per juz; hizbQuarter 1..4 per hizb-quarter; hizb = ceil(hizbQuarter/2)
  const map = new Map();
  surahs.forEach(s => {
    s.ayahs.forEach(a => {
      const hizb = Math.ceil(a.hizbQuarter / 4);
      if (!map.has(hizb)) map.set(hizb, { hizb, start: { surah: s.number, ayah: a.numberInSurah }, end: null });
      map.get(hizb).end = { surah: s.number, ayah: a.numberInSurah };
    });
  });
  return Array.from(map.values()).sort((a, b) => a.hizb - b.hizb);
};

/**
 * Get all ayahs belonging to a specific juz, grouped by surah in sequential order.
 * Returns an array of { surah, ayahs } where ayahs are the ayah objects from quranAr/quranEn.
 * Each ayah is augmented with `surahNumber` and `surahName` for cross-surah rendering.
 */
export const getAyahsForJuz = (juzNumber, quranAr, quranEn, surahsMeta) => {
  if (!quranAr || !quranEn || !surahsMeta) return [];
  const groups = [];
  const surahMap = new Map(surahsMeta.map(s => [s.number, s]));

  quranAr.surahs.forEach((arSurah, idx) => {
    const surahNum = arSurah.number;
    const enSurah = quranEn.surahs.find(s => s.number === surahNum);
    // Build a lookup map from numberInSurah -> english text for O(1) access
    const enAyahMap = new Map();
    enSurah?.ayahs?.forEach(ea => enAyahMap.set(ea.numberInSurah, ea.text));
    const matchingAyahs = arSurah.ayahs.filter(a => a.juz === juzNumber);
    if (matchingAyahs.length > 0) {
      const surahMeta = surahMap.get(surahNum);
      groups.push({
        surah: surahMeta || { number: surahNum, name: '', englishName: `Surah ${surahNum}` },
        ayahs: matchingAyahs.map((a) => ({
          ...a,
          surahNumber: surahNum,
          surahName: surahMeta?.englishName || `Surah ${surahNum}`,
          englishText: enAyahMap.get(a.numberInSurah) || '',
        })),
      });
    }
  });

  return groups;
};

/**
 * Get all ayahs belonging to a specific hizb, grouped by surah in sequential order.
 * Hizb is derived from hizbQuarter: hizb = ceil(hizbQuarter / 4).
 */
export const getAyahsForHizb = (hizbNumber, quranAr, quranEn, surahsMeta) => {
  if (!quranAr || !quranEn || !surahsMeta) return [];
  const groups = [];
  const surahMap = new Map(surahsMeta.map(s => [s.number, s]));

  quranAr.surahs.forEach((arSurah, idx) => {
    const surahNum = arSurah.number;
    const enSurah = quranEn.surahs.find(s => s.number === surahNum);
    // Build a lookup map from numberInSurah -> english text for O(1) access
    const enAyahMap = new Map();
    enSurah?.ayahs?.forEach(ea => enAyahMap.set(ea.numberInSurah, ea.text));
    const matchingAyahs = arSurah.ayahs.filter(a => Math.ceil(a.hizbQuarter / 4) === hizbNumber);
    if (matchingAyahs.length > 0) {
      const surahMeta = surahMap.get(surahNum);
      groups.push({
        surah: surahMeta || { number: surahNum, name: '', englishName: `Surah ${surahNum}` },
        ayahs: matchingAyahs.map((a) => ({
          ...a,
          surahNumber: surahNum,
          surahName: surahMeta?.englishName || `Surah ${surahNum}`,
          englishText: enAyahMap.get(a.numberInSurah) || '',
        })),
      });
    }
  });

  return groups;
};

/**
 * Get a flat list of all ayahs for a juz (for audio playback, etc.)
 */
export const getFlatAyahsForJuz = (juzNumber, quranAr, quranEn) => {
  if (!quranAr || !quranEn) return [];
  const flat = [];
  quranAr.surahs.forEach((arSurah, idx) => {
    const enSurah = quranEn.surahs.find(s => s.number === arSurah.number);
    // Build a lookup map from numberInSurah -> english text for O(1) access
    const enAyahMap = new Map();
    enSurah?.ayahs?.forEach(ea => enAyahMap.set(ea.numberInSurah, ea.text));
    arSurah.ayahs.forEach((a) => {
      if (a.juz === juzNumber) {
        flat.push({
          ...a,
          surahNumber: arSurah.number,
          surahName: enSurah?.englishName || `Surah ${arSurah.number}`,
          englishText: enAyahMap.get(a.numberInSurah) || '',
        });
      }
    });
  });
  return flat;
};

/**
 * Get a flat list of all ayahs for a hizb (for audio playback, etc.)
 */
export const getFlatAyahsForHizb = (hizbNumber, quranAr, quranEn) => {
  if (!quranAr || !quranEn) return [];
  const flat = [];
  quranAr.surahs.forEach((arSurah, idx) => {
    const enSurah = quranEn.surahs.find(s => s.number === arSurah.number);
    // Build a lookup map from numberInSurah -> english text for O(1) access
    const enAyahMap = new Map();
    enSurah?.ayahs?.forEach(ea => enAyahMap.set(ea.numberInSurah, ea.text));
    arSurah.ayahs.forEach((a) => {
      if (Math.ceil(a.hizbQuarter / 4) === hizbNumber) {
        flat.push({
          ...a,
          surahNumber: arSurah.number,
          surahName: enSurah?.englishName || `Surah ${arSurah.number}`,
          englishText: enAyahMap.get(a.numberInSurah) || '',
        });
      }
    });
  });
  return flat;
};
