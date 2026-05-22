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

export const RECITERS = [
  { id: 'ar.alafasy',           name: 'Mishary Alafasy',         style: 'Melodic · Clear',      bitrate: 128 },
  { id: 'ar.husary',            name: 'Mahmoud Al-Husary',       style: 'Tajweed · Learning',   bitrate: 128 },
  { id: 'ar.minshawi',          name: 'Mohamed Al-Minshawi',     style: 'Slow · Traditional',   bitrate: 128 },
  { id: 'ar.abdulbasitmurattal',name: 'Abdul Basit (Murattal)',  style: 'Classic · Measured',   bitrate: 64 },
  { id: 'ar.hudhaify',          name: 'Ali Al-Huthaify',         style: 'Clear · Steady',       bitrate: 128 },
  { id: 'ar.saoodshuraym',      name: "Sa'ud Ash-Shuraim",       style: 'Fast · Revision',      bitrate: 64 },
  { id: 'ar.mahermuaiqly',      name: 'Maher Al-Muaiqly',        style: 'Modern · Flowing',     bitrate: 128 },
  { id: 'Ghamadi_40kbps',       name: 'Saad Al-Ghamidi',         style: 'Warm · Flowing',       provider: 'everyayah' },
];

export const getAudioUrl = (number, reciterId = 'ar.alafasy', surahNum = null, ayahNum = null) => {
  const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
  
  if (reciter.provider === 'everyayah' && surahNum && ayahNum) {
    const s = String(surahNum).padStart(3, '0');
    const a = String(ayahNum).padStart(3, '0');
    return `https://everyayah.com/data/${reciter.id}/${s}${a}.mp3`;
  }
  
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.id}/${number}.mp3`;
};
