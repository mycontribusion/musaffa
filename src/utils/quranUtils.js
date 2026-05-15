/**
 * Quran Utilities for Global Indexing and Text Processing
 */

export const getAyahByGlobal = (globalIndex, quranAr, surahs) => {
  if (!quranAr || !surahs) return null;
  const targetIndex = Array.isArray(globalIndex) ? globalIndex[0] : globalIndex;
  let count = 0;
  for (let s = 0; s < 114; s++) {
    const surah = quranAr.surahs[s];
    if (count + surah.ayahs.length >= targetIndex) {
      const indexInSurah = targetIndex - count - 1;
      if (indexInSurah < 0) return null;
      return {
        ...surah.ayahs[indexInSurah],
        surahNumber: s + 1,
        surahName: surahs[s].englishName,
        numberInSurah: indexInSurah + 1
      };
    }
    count += surah.ayahs.length;
  }
  return null;
};

export const getAyahTextByGlobal = (globalIndex, quranAr) => {
  if (!quranAr) return "";
  const indices = Array.isArray(globalIndex) ? globalIndex : [globalIndex];
  return indices.map(idx => {
    let count = 0;
    for (let s = 0; s < 114; s++) {
      const surah = quranAr.surahs[s];
      if (count + surah.ayahs.length >= idx) {
        const indexInSurah = idx - count - 1;
        return surah.ayahs[indexInSurah]?.text || "";
      }
      count += surah.ayahs.length;
    }
    return "";
  }).join(" ");
};

export const removeTashkeel = (text) => text.replace(/[\u064B-\u065F]/g, "");

export const getAudioUrl = (number) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${number}.mp3`;
