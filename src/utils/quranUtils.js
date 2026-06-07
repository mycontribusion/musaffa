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

/**
 * Normalise Arabic text for recitation comparison:
 * - Strips all tashkeel (diacritics) U+064B–U+065F
 * - Normalises alef variants (أإآٱ) → plain alef (ا)
 * - Normalises waw-hamza (ؤ) → waw (و)
 * - Normalises ya-hamza (ئ) → ya (ي)
 * - Normalises ta-marbuta (ة) → ha (ه)
 * - Strips tatweel (ـ)
 * - Strips zero-width chars
 */
export const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, '')          // tashkeel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // alef variants → ا
    .replace(/\u0624/g, '\u0648')              // ؤ → و
    .replace(/\u0626/g, '\u064A')              // ئ → ي
    .replace(/\u0629/g, '\u0647')              // ة → ه
    .replace(/\u0640/g, '')                    // tatweel ـ
    .replace(/[\u200B-\u200D\uFEFF]/g, '')    // zero-width chars
    .trim();
};

/**
 * Compare user's spoken recitation against expected canonical text.
 * Returns:
 *   results: Array<{ word: string, status: 'correct'|'missed'|'extra' }>
 *   accuracy: number (0–100)
 */
export const compareRecitation = (expectedText, spokenText) => {
  const expWords = normalizeArabic(expectedText).split(/\s+/).filter(Boolean);
  const spkWords = normalizeArabic(spokenText).split(/\s+/).filter(Boolean);

  if (expWords.length === 0) return { results: [], accuracy: 100 };
  if (spkWords.length === 0) {
    return {
      results: expWords.map(w => ({ word: w, status: 'missed' })),
      accuracy: 0,
    };
  }

  // Build a lookup of spoken words for O(1) presence checks
  const spkSet = new Set(spkWords);

  // LCS-based word alignment
  const m = expWords.length;
  const n = spkWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = expWords[i - 1] === spkWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Back-track to get matched indices
  const matchedExp = new Set();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (expWords[i - 1] === spkWords[j - 1]) {
      matchedExp.add(i - 1);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const results = expWords.map((word, idx) => ({
    word,
    status: matchedExp.has(idx) ? 'correct' : 'missed',
  }));

  const correct = results.filter(r => r.status === 'correct').length;
  const accuracy = Math.round((correct / m) * 100);

  return { results, accuracy };
};

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
