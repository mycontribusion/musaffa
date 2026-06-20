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
 * Normalise Arabic text for recitation comparison.
 *
 * Tajweed-aware passes:
 *  - Harakat (tashkeel) preserved
 *  - Alef variants (أإآٱ) → ا
 *  - Alef maqsura (ى) → ي  [STT commonly conflates these]
 *  - Waw-hamza (ؤ) → و
 *  - Ya-hamza (ئ) → ي
 *  - Ta-marbuta (ة) → ه   [word-final, STT often drops the dots]
 *  - Tatweel (ـ) stripped
 *  - Zero-width / BOM chars stripped
 *  - Consecutive identical letter collapse (≥4 → 2)
 *    Handles madd artifacts where STT elongates chars: آآآ → آ,
 *    or STT drops the madd alef and repeats: وووو → وو
 *  - Qalqalah letters (ق ط ب ج د) are kept as-is; their echoing
 *    bounce is phonetic and doesn't change orthography — fuzzy
 *    matching handles minor STT mis-reads of these.
 */
export const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    // 1. Strip all Tashkeel (vowel marks, shadda, sukoon, etc.)
    .replace(/[\u064B-\u065F]/g, '')
    // 2. Normalize all Alef variants to a bare Alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // 3. Normalize Alef Maksura to Yaa
    .replace(/\u0649/g, '\u064A')
    // 4. Normalize Waw with Hamza to plain Waw
    .replace(/\u0624/g, '\u0648')
    // 5. Normalize Yaa with Hamza to plain Yaa
    .replace(/\u0626/g, '\u064A')
    // 6. Normalize Ta Marbuta to Haa
    .replace(/\u0629/g, '\u0647')
    // 7. Remove Tatweel (Kashida)
    .replace(/\u0640/g, '')
    // 8. Remove zero-width spaces and formatting characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 9. Remove punctuation
    .replace(/[،؛؟!.,:;'"()[\]{}]/g, '')
    // 10. Collapse repeated characters (e.g., STT sometimes outputs "ووو" instead of "و")
    // Note: We only collapse if it's repeated 3 or more times to avoid breaking words like "الله"
    .replace(/(.)\1{3,}/g, '$1$1')
    .trim();
};

// Known Muqatta'at tokens as they appear in Quran text (after tashkeel removal)
// Maps compressed form → expanded letter-name form
export const MUQATTAAT_EXPANSIONS = {
  'الم':    'الف لام ميم',
  'الر':    'الف لام را',
  'المر':   'الف لام ميم را',
  'المص':   'الف لام ميم صاد',
  'كهيعص':  'كاف ها يا عين صاد',
  'طه':     'طا ها',
  'طسم':    'طا سين ميم',
  'طس':     'طا سين',
  'يس':     'يا سين',
  'ص':      'صاد',
  'حم':     'حا ميم',
  'حمعسق':  'حا ميم عين سين قاف',
  'ق':      'قاف',
  'ن':      'نون',
};

/**
 * Expand Muqatta'at tokens in the expected text into their individual letter
 * name pronunciations. This allows the comparison to match the STT's natural
 * output of letter names (e.g. "الف لام ميم") word by word.
 * Applied to the expected text before comparison.
 */
export const expandMuqattaat = (text) => {
  if (!text) return text;
  let result = text;
  // Replace longest matches first to avoid partial replacements
  const sortedKeys = Object.keys(MUQATTAAT_EXPANSIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    // Only replace at word boundaries
    const regex = new RegExp(`(^|\\s)${key}(\\s|$)`, 'g');
    result = result.replace(regex, `$1${MUQATTAAT_EXPANSIONS[key]}$2`);
  }
  return result;
};

// ── Levenshtein edit distance (character-level) ─────────────────────────────
const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length, n = b.length;
  // Use two-row rolling array for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

/**
 * Fuzzy edit-distance tolerance scaled to word length.
 *
 * Short words (≤3 chars): must match exactly — avoids false positives
 * on common particles like في / من / ما.
 * Longer words allow 1-2 edits to absorb:
 *   - Madd drop (ملك vs مالك: edit dist = 1)
 *   - Qalqalah echo mis-transcription (قلب vs قالب)
 *   - Ghunnah nasalisation artefacts on word boundaries
 */
const fuzzyTolerance = (word) => {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 2;  // cap at 2 to avoid over-matching long words
};

const fuzzyMatch = (a, b) => {
  if (a === b) return true;
  // Prevent matching words that differ only in the last character
  // (e.g., الرحمن vs الرحيم) to avoid confusing similar Quranic words
  if (a.length === b.length && a.length > 1) {
    const aBody = a.slice(0, -1);
    const bBody = b.slice(0, -1);
    if (aBody === bBody) return false;
  }
  const tol = Math.min(fuzzyTolerance(a), fuzzyTolerance(b));
  if (tol === 0) return false;
  // Fast length-gate: if lengths differ by more than tolerance, skip expensive lev
  if (Math.abs(a.length - b.length) > tol) return false;
  return levenshtein(a, b) <= tol;
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
