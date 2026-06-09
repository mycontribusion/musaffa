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
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // alef variants → ا
    .replace(/\u0649/g, '\u064A')               // alef maqsura ى → ي
    .replace(/\u0624/g, '\u0648')               // ؤ → و
    .replace(/\u0626/g, '\u064A')               // ئ → ي
    .replace(/\u0629/g, '\u0647')               // ة → ه
    .replace(/\u0640/g, '')                     // tatweel
    .replace(/[\u200B-\u200D\uFEFF]/g, '')      // zero-width / BOM
    .replace(/[،؛؟!.,:;'"()[\]{}]/g, '')       // strip punctuation (Arabic + Latin)
    .replace(/(.)\1{3,}/g, '$1$1')             // collapse ≥4 identical chars → 2 (madd STT artifact)
    .trim();
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

/**
 * Compare user's spoken recitation against expected canonical text.
 *
 * Algorithm:
 *   1. Normalise both sides with normalizeArabic()
 *   2. Run fuzzy-LCS (Longest Common Subsequence) using fuzzyMatch()
 *   3. Back-track matches into ordered pairs (expIdx, spkIdx)
 *   4. Classify gaps between matched pairs:
 *        gap in expected only  → omission  (word was skipped)
 *        gap in spoken only    → insertion (extra word added)
 *        equal gaps both sides → substitution (wrong word at same position)
 *
 * Returns:
 *   results:    Array<{ word, status: 'correct'|'omission'|'substitution', spokenWord? }>
 *   insertions: Array<{ word, status: 'insertion' }>
 *   accuracy:   number 0–100 (correct / total expected words)
 *   breakdown:  { correct, omissions, substitutions, insertions }
 */
export const compareRecitation = (expectedText, spokenText) => {
  // Strip tashkeel from expected text only — STT output typically lacks harakat,
  // so we normalise the reference to plain letters for a fair word-level comparison.
  const expNorm = expectedText.replace(/[\u064B-\u065F]/g, '');
  const expWords = normalizeArabic(expNorm).split(/\s+/).filter(Boolean);
  const rawSpkWords = normalizeArabic(spokenText).split(/\s+/).filter(Boolean);

  // Deduplicate consecutive identical words in spoken text.
  // STT often repeats words (e.g., "الله الله الله" → "الله"), which would
  // cause the limited lookahead to miss subsequent expected words.
  const spkWords = [];
  for (let i = 0; i < rawSpkWords.length; i++) {
    if (i === 0 || rawSpkWords[i] !== rawSpkWords[i - 1]) {
      spkWords.push(rawSpkWords[i]);
    }
  }

  if (expWords.length === 0) return { results: [], insertions: [], accuracy: 100, breakdown: { correct: 0, omissions: 0, substitutions: 0, insertions: 0 } };
  if (spkWords.length === 0) {
    return {
      results: expWords.map(w => ({ word: w, status: 'omission', spokenWord: null })),
      insertions: [],
      accuracy: 0,
      breakdown: { correct: 0, omissions: expWords.length, substitutions: 0, insertions: 0 },
    };
  }

  // Sequential matching: enforce positional order to prevent earlier words
  // from being "stolen" by later similar words as the transcript grows.
  const results = [];
  const insertions = [];
  let spkIdx = 0;
  let correct = 0, omissions = 0, substitutions = 0;

  for (let expIdx = 0; expIdx < expWords.length; expIdx++) {
    const expWord = expWords[expIdx];

    // Look for a match in the next few spoken words (limited lookahead)
    let bestMatch = -1;
    const lookahead = Math.min(30, spkWords.length - spkIdx);
    for (let i = 0; i < lookahead; i++) {
      const candidateIdx = spkIdx + i;
      if (fuzzyMatch(expWord, spkWords[candidateIdx])) {
        bestMatch = candidateIdx;
        break; // Use the first (earliest) match to maintain order
      }
    }

    if (bestMatch !== -1) {
      // Mark any skipped spoken words as insertions
      for (let i = spkIdx; i < bestMatch; i++) {
        insertions.push({ word: spkWords[i], status: 'insertion' });
      }

      const spkWord = spkWords[bestMatch];
      const isExact = expWord === spkWord;
      results.push({
        word: expWord,
        status: isExact ? 'correct' : 'substitution',
        spokenWord: spkWord,
      });
      if (isExact) correct++;
      else substitutions++;

      spkIdx = bestMatch + 1;
    } else {
      results.push({ word: expWord, status: 'omission', spokenWord: null });
      omissions++;
    }
  }

  // Remaining spoken words are insertions
  for (let i = spkIdx; i < spkWords.length; i++) {
    insertions.push({ word: spkWords[i], status: 'insertion' });
  }

  const accuracy = Math.round((correct / expWords.length) * 100);

  return {
    results,
    insertions,
    accuracy,
    breakdown: { correct, omissions, substitutions, insertions: insertions.length },
  };
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
